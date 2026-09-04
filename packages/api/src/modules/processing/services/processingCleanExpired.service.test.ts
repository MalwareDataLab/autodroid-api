import { beforeEach, describe, it, expect, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { ProcessingCleanExpiredService } from "./processingCleanExpired.service";

describe("Service: ProcessingCleanExpiredService", () => {
  let processingCleanExpiredService: ProcessingCleanExpiredService;
  let processingRepository: IProcessingRepository;
  let storageProvider: IStorageProvider;

  beforeEach(context => {
    processingCleanExpiredService = context.container.resolve(
      ProcessingCleanExpiredService,
    );
    processingRepository = context.container.resolve("ProcessingRepository");
    storageProvider = context.container.resolve("StorageProvider");
  });

  it("should remove expired processes with and without files", async () => {
    const resultFile = await fileFactory.create();
    const metricsFile = await fileFactory.create();

    const processingWithFiles = await processingFactory.create({
      keep_until: faker.date.past(),
      result_file_id: resultFile.id,
      metrics_file_id: metricsFile.id,
    });
    const processingWithoutFilesSeed = await processingFactory.create({
      keep_until: faker.date.past(),
    });
    // The factory's relation loader auto-creates a placeholder file whenever
    // result_file_id/metrics_file_id is falsy, so force the "no file" state
    // with a direct update instead of relying on the create-time default.
    const processingWithoutFiles = (await processingRepository.updateOne(
      { id: processingWithoutFilesSeed.id },
      { result_file_id: null, metrics_file_id: null },
    ))!;
    await processingFactory.create({ keep_until: faker.date.future() });

    const response = await processingCleanExpiredService.execute();

    expect(response).toBe(2);
    expect(storageProvider.removeFileByPath).toHaveBeenCalledTimes(2);
    await expect(
      processingRepository.findOne({ id: processingWithFiles.id }),
    ).resolves.toBeNull();
    await expect(
      processingRepository.findOne({ id: processingWithoutFiles.id }),
    ).resolves.toBeNull();
  });

  it("should not increment the count when a removal fails", async () => {
    const resultFile = await fileFactory.create();

    const processing = await processingFactory.create({
      keep_until: faker.date.past(),
      result_file_id: resultFile.id,
      metrics_file_id: null,
    });

    vi.spyOn(storageProvider, "removeFileByPath").mockRejectedValueOnce(
      new Error("boom"),
    );

    const response = await processingCleanExpiredService.execute();

    expect(response).toBe(0);
    await expect(
      processingRepository.findOne({ id: processing.id }),
    ).resolves.toMatchObject({ id: processing.id });
  });
});
