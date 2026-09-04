import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingProgressService } from "./workerHandleProcessingProgress.service";

describe("Service: WorkerHandleProcessingProgressService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let workerHandleProcessingProgressService: WorkerHandleProcessingProgressService;

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

    workerHandleProcessingProgressService =
      new WorkerHandleProcessingProgressService(processingRepositoryMock);
  });

  it("should update the processing progress", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
      started_at: new Date(),
    });
    const updatedProcessing = processingFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response = await workerHandleProcessingProgressService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toBe(updatedProcessing);
  });

  it("should return the processing when it already succeeded and is complete", async () => {
    const worker = workerFactory.build();
    const metrics_file = fileFactory.build({
      public_url: faker.internet.url(),
    });
    const result_file = fileFactory.build({ public_url: faker.internet.url() });
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.SUCCEEDED },
      { associations: { metrics_file, result_file } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    const response = await workerHandleProcessingProgressService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toBe(processing);
    expect(processingRepositoryMock.updateOne).not.toHaveBeenCalled();
  });

  it("should throw if the processing was not found", async () => {
    const worker = workerFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerHandleProcessingProgressService.execute({
        worker,
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_progress_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the processing was not updated", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
      started_at: null,
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(
      null as unknown as ReturnType<typeof processingFactory.build>,
    );

    await expect(() =>
      workerHandleProcessingProgressService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_progress_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
