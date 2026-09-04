import { beforeEach, describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { UserProcessingDeleteService } from "./userProcessingDelete.service";

describe("Service: UserProcessingDeleteService", () => {
  let userProcessingDeleteService: UserProcessingDeleteService;
  let processingRepository: IProcessingRepository;
  let storageProvider: IStorageProvider;

  const seed = async (params: { withFiles: boolean }) => {
    const user = await userFactory.create();
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const resultFile = params.withFiles ? await fileFactory.create() : null;
    const metricsFile = params.withFiles ? await fileFactory.create() : null;

    let processing = await processingFactory.create(
      {
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        result_file_id: resultFile?.id ?? null,
        metrics_file_id: metricsFile?.id ?? null,
      },
      { associations: { user, dataset, processor } },
    );

    if (!params.withFiles) {
      // The factory's relation loader auto-creates a placeholder file
      // whenever the id is falsy, so force the "no file" state directly.
      processing = (await processingRepository.updateOne(
        { id: processing.id },
        { result_file_id: null, metrics_file_id: null },
      ))!;
    }

    return { user, dataset, processor, processing };
  };

  beforeEach(context => {
    userProcessingDeleteService = context.container.resolve(
      UserProcessingDeleteService,
    );
    processingRepository = context.container.resolve("ProcessingRepository");
    storageProvider = context.container.resolve("StorageProvider");
  });

  it("should delete a processing removing its files", async () => {
    const { user, processing } = await seed({ withFiles: true });

    const response = await userProcessingDeleteService.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response.id).toBe(processing.id);
    expect(storageProvider.removeFileByPath).toHaveBeenCalledTimes(2);
    await expect(
      processingRepository.findOne({ id: processing.id }),
    ).resolves.toBeNull();
  });

  it("should delete a processing without files", async () => {
    const { user, processing } = await seed({ withFiles: false });

    const response = await userProcessingDeleteService.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response.id).toBe(processing.id);
    expect(storageProvider.removeFileByPath).not.toHaveBeenCalled();
    await expect(
      processingRepository.findOne({ id: processing.id }),
    ).resolves.toBeNull();
  });

  it("should throw when the processing does not belong to the user", async () => {
    const { processing } = await seed({ withFiles: false });
    const otherUser = await userFactory.create();

    await expect(() =>
      userProcessingDeleteService.execute({
        user: otherUser,
        processing_id: processing.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_delete_service/CANNOT_DELETE_PROCESSING",
      }),
    );

    await expect(
      processingRepository.findOne({ id: processing.id }),
    ).resolves.toMatchObject({ id: processing.id });
  });

  it("should throw when the processing was not found", async () => {
    const user = await userFactory.create();

    await expect(() =>
      userProcessingDeleteService.execute({
        user,
        processing_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSING_NOT_FOUND",
      }),
    );
  });
});
