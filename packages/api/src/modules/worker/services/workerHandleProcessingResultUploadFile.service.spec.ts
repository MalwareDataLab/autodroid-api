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
import { WorkerHandleProcessingResultUploadFileService } from "./workerHandleProcessingResultUploadFile.service";

describe("Service: WorkerHandleProcessingResultUploadFileService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let workerHandleProcessingResultUploadFileService: WorkerHandleProcessingResultUploadFileService;

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

    workerHandleProcessingResultUploadFileService =
      new WorkerHandleProcessingResultUploadFileService(
        processingRepositoryMock,
      );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should confirm the result file upload", async () => {
    const worker = workerFactory.build();
    const result_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: new Date() },
      { associations: { result_file } },
    );
    const updatedProcessing = processingFactory.build(
      {},
      { associations: { result_file } },
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
      await workerHandleProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
      });

    expect(response).toBe(updatedProcessing.result_file);
  });

  it("should throw if the processing was not found", async () => {
    const worker = workerFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerHandleProcessingResultUploadFileService.execute({
        worker,
        processing_id: faker.string.uuid(),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_result_upload_file_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the result file was not found", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_result_upload_file_service/RESULT_FILE_NOT_FOUND",
      }),
    );
  });

  it("should throw if the result file has no public url", async () => {
    const worker = workerFactory.build();
    const result_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING },
      { associations: { result_file } },
    );

    vi.spyOn(File, "process").mockResolvedValueOnce(
      fileFactory.build({
        public_url: null,
        provider_status: FILE_PROVIDER_STATUS.READY,
      }),
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_result_upload_file_service/RESULT_NOT_AVAILABLE",
      }),
    );
  });

  it("should throw if the result file provider status is not ready", async () => {
    const worker = workerFactory.build();
    const result_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING },
      { associations: { result_file } },
    );

    vi.spyOn(File, "process").mockResolvedValueOnce(
      fileFactory.build({
        public_url: faker.internet.url(),
        provider_status: FILE_PROVIDER_STATUS.PENDING,
      }),
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      workerHandleProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_result_upload_file_service/RESULT_NOT_AVAILABLE",
      }),
    );
  });

  it("should throw if the processing was not updated", async () => {
    const worker = workerFactory.build();
    const result_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: null },
      { associations: { result_file } },
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
      workerHandleProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_result_upload_file_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
