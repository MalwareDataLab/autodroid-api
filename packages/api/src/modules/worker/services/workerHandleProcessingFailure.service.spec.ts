import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingFailureService } from "./workerHandleProcessingFailure.service";

describe("Service: WorkerHandleProcessingFailureService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let jobProviderMock: Mocked<IJobProvider>;

  let workerHandleProcessingFailureService: WorkerHandleProcessingFailureService;

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

    jobProviderMock = {
      initialization: Promise.resolve(),
      add: vi.fn(),
      close: vi.fn(),
    };

    workerHandleProcessingFailureService =
      new WorkerHandleProcessingFailureService(
        processingRepositoryMock,
        jobProviderMock,
      );
  });

  it("should mark the processing as failed with the provided reason", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
      started_at: new Date(),
      reported_at: new Date(),
    });
    const updatedProcessing = processingFactory.build({
      reported_at: new Date(),
    });

    processingRepositoryMock.findOne
      .mockResolvedValueOnce(processing)
      .mockResolvedValueOnce(updatedProcessing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response = await workerHandleProcessingFailureService.execute({
      worker,
      processing_id: processing.id,
      data: { reason: "boom" },
    });

    expect(response).toBe(updatedProcessing);
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: processing.id },
      expect.objectContaining({
        status: PROCESSING_STATUS.FAILED,
        message: "boom",
      }),
    );
  });

  it("should throw if the processing was not found", async () => {
    const worker = workerFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerHandleProcessingFailureService.execute({
        worker,
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_failure_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the processing already succeeded", async () => {
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

    await expect(() =>
      workerHandleProcessingFailureService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_failure_service/PROCESSING_ALREADY_SUCCEEDED",
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
      workerHandleProcessingFailureService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_failure_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
