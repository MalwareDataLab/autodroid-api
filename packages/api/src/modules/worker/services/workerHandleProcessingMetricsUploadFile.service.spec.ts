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
import { WorkerHandleProcessingMetricsUploadFileService } from "./workerHandleProcessingMetricsUploadFile.service";

describe("Service: WorkerHandleProcessingMetricsUploadFileService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let workerHandleProcessingMetricsUploadFileService: WorkerHandleProcessingMetricsUploadFileService;

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

    workerHandleProcessingMetricsUploadFileService =
      new WorkerHandleProcessingMetricsUploadFileService(
        processingRepositoryMock,
      );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should confirm the metrics file upload", async () => {
    const worker = workerFactory.build();
    const metrics_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: new Date() },
      { associations: { metrics_file } },
    );
    const updatedProcessing = processingFactory.build(
      {},
      { associations: { metrics_file } },
    );

    vi.spyOn(File, "process").mockResolvedValueOnce(
      fileFactory.build({
        public_url: faker.internet.url(),
        provider_status: FILE_PROVIDER_STATUS.READY,
      }),
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response =
      await workerHandleProcessingMetricsUploadFileService.execute({
        worker,
        processing_id: processing.id,
      });

    expect(response).toBe(updatedProcessing.metrics_file);
  });

  it("should throw if the processing was not found", async () => {
    const worker = workerFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerHandleProcessingMetricsUploadFileService.execute({
        worker,
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_metrics_upload_file_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the metrics file was not found", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingMetricsUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_metrics_upload_file_service/METRICS_FILE_NOT_FOUND",
      }),
    );
  });

  it("should throw if the metrics file has no public url", async () => {
    const worker = workerFactory.build();
    const metrics_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING },
      { associations: { metrics_file } },
    );

    vi.spyOn(File, "process").mockResolvedValueOnce(
      fileFactory.build({
        public_url: null,
        provider_status: FILE_PROVIDER_STATUS.READY,
      }),
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingMetricsUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_metrics_upload_file_service/METRICS_NOT_AVAILABLE",
      }),
    );
  });

  it("should throw if the metrics file provider status is not ready", async () => {
    const worker = workerFactory.build();
    const metrics_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING },
      { associations: { metrics_file } },
    );

    vi.spyOn(File, "process").mockResolvedValueOnce(
      fileFactory.build({
        public_url: faker.internet.url(),
        provider_status: FILE_PROVIDER_STATUS.PENDING,
      }),
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingMetricsUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_metrics_upload_file_service/METRICS_NOT_AVAILABLE",
      }),
    );
  });

  it("should throw if the processing was not updated", async () => {
    const worker = workerFactory.build();
    const metrics_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: null },
      { associations: { metrics_file } },
    );

    vi.spyOn(File, "process").mockResolvedValueOnce(
      fileFactory.build({
        public_url: faker.internet.url(),
        provider_status: FILE_PROVIDER_STATUS.READY,
      }),
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.updateOne.mockResolvedValueOnce(
      null as unknown as ReturnType<typeof processingFactory.build>,
    );

    await expect(() =>
      workerHandleProcessingMetricsUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_metrics_upload_file_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
