import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingSuccessService } from "./workerHandleProcessingSuccess.service";

describe("Service: WorkerHandleProcessingSuccessService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let jobProviderMock: Mocked<IJobProvider>;

  let workerHandleProcessingSuccessService: WorkerHandleProcessingSuccessService;

  const buildReadyFile = () =>
    fileFactory.build({
      public_url: faker.internet.url(),
      provider_status: FILE_PROVIDER_STATUS.READY,
    });

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

    workerHandleProcessingSuccessService =
      new WorkerHandleProcessingSuccessService(
        processingRepositoryMock,
        jobProviderMock,
      );

    vi.spyOn(File, "process").mockImplementation(async file => file);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should mark the processing as succeeded with both output files", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: new Date() },
      {
        associations: {
          result_file: buildReadyFile(),
          metrics_file: buildReadyFile(),
        },
      },
    );
    const updatedProcessing = processingFactory.build({
      reported_at: new Date(),
    });

    processingRepositoryMock.findOne
      .mockResolvedValueOnce(processing)
      .mockResolvedValueOnce(updatedProcessing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response = await workerHandleProcessingSuccessService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toBe(updatedProcessing);
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: processing.id },
      expect.objectContaining({ status: PROCESSING_STATUS.SUCCEEDED }),
    );
  });

  it("should mark the processing as succeeded with only the metrics file", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: new Date() },
      { associations: { metrics_file: buildReadyFile() } },
    );
    const updatedProcessing = processingFactory.build({
      reported_at: new Date(),
    });

    processingRepositoryMock.findOne
      .mockResolvedValueOnce(processing)
      .mockResolvedValueOnce(updatedProcessing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response = await workerHandleProcessingSuccessService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toBe(updatedProcessing);
  });

  it("should throw if the processing was not found", async () => {
    const worker = workerFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerHandleProcessingSuccessService.execute({
        worker,
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_success_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if there are no output files", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingSuccessService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_success_service/NO_OUTPUT_FILES_FOUND",
      }),
    );
  });

  it("should throw if a required file is not available", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING },
      {
        associations: {
          result_file: fileFactory.build({
            public_url: null,
            provider_status: FILE_PROVIDER_STATUS.PENDING,
          }),
        },
      },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingSuccessService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_success_service/FILE_NOT_AVAILABLE",
      }),
    );
  });

  it("should throw if the processing was not updated", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: null },
      { associations: { result_file: buildReadyFile() } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(
      null as unknown as ReturnType<typeof processingFactory.build>,
    );

    await expect(() =>
      workerHandleProcessingSuccessService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_success_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
