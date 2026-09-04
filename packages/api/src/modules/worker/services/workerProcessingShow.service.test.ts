import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { WorkerProcessingShowService } from "./workerProcessingShow.service";

describe("Service: WorkerProcessingShowService", () => {
  let processingRepository: IProcessingRepository;

  let workerProcessingShowService: WorkerProcessingShowService;

  beforeEach(() => {
    processingRepository = container.resolve("ProcessingRepository");

    workerProcessingShowService = new WorkerProcessingShowService(
      processingRepository,
    );
  });

  it("should show a processing", async () => {
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({ worker_id: worker.id });

    const response = await workerProcessingShowService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toEqual(expect.objectContaining({ id: processing.id }));
  });

  it("should throw if the processing was not found", async () => {
    const worker = await workerFactory.create();

    await expect(() =>
      workerProcessingShowService.execute({
        worker,
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_processing_show_service/PROCESSING_NOT_FOUND",
      }),
    );
  });
});
