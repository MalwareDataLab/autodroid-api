import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Service import
import { WorkerProcessingShowService } from "./workerProcessingShow.service";

describe("Service: WorkerProcessingShowService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let workerProcessingShowService: WorkerProcessingShowService;

  beforeEach(() => {
    processingRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      getOneEstimatedExecutionTime: vi.fn(),
      getManyEstimatedExecutionTimes: vi.fn(),
    };

    workerProcessingShowService = new WorkerProcessingShowService(
      processingRepositoryMock,
    );
  });

  it("should show a processing", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    const response = await workerProcessingShowService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toBe(processing);
  });

  it("should throw if the processing was not found", async () => {
    const worker = workerFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

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
