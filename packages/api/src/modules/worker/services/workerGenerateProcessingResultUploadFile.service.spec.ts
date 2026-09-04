import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerGenerateProcessingResultUploadFileService } from "./workerGenerateProcessingResultUploadFile.service";

describe("Service: WorkerGenerateProcessingResultUploadFileService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let storageProviderMock: Mocked<IStorageProvider>;

  let workerGenerateProcessingResultUploadFileService: WorkerGenerateProcessingResultUploadFileService;

  const data: RequestFileUploadSignedUrlSchema = {
    filename: "result.csv",
    mime_type: MIME_TYPE.CSV,
    size: 1024,
    md5_hash: faker.string.hexadecimal({ length: 32, prefix: "" }),
  };

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

    storageProviderMock = {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    };

    workerGenerateProcessingResultUploadFileService =
      new WorkerGenerateProcessingResultUploadFileService(
        processingRepositoryMock,
        storageProviderMock,
      );
  });

  it("should generate a result upload url and remove the previous result file", async () => {
    const worker = workerFactory.build();
    const previous_result_file = fileFactory.build();
    const processing = processingFactory.build(
      { status: PROCESSING_STATUS.RUNNING, started_at: new Date() },
      { associations: { result_file: previous_result_file } },
    );

    const generatedFile = fileFactory.build();
    const updatedProcessing = processingFactory.build(
      {},
      { associations: { result_file: generatedFile } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    storageProviderMock.generateUploadSignedUrl.mockResolvedValueOnce(
      generatedFile,
    );
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response =
      await workerGenerateProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
        data,
      });

    expect(response).toBe(updatedProcessing.result_file);
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledWith({
      path: previous_result_file.provider_path,
      language: expect.any(String),
    });
  });

  it("should generate a result upload url without a previous result file", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
      started_at: null,
    });

    const generatedFile = fileFactory.build();
    const updatedProcessing = processingFactory.build(
      {},
      { associations: { result_file: generatedFile } },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    storageProviderMock.generateUploadSignedUrl.mockResolvedValueOnce(
      generatedFile,
    );
    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response =
      await workerGenerateProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
        data,
      });

    expect(response).toBe(updatedProcessing.result_file);
    expect(storageProviderMock.removeFileByPath).not.toHaveBeenCalled();
  });

  it("should throw if the processing was not found", async () => {
    const worker = workerFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerGenerateProcessingResultUploadFileService.execute({
        worker,
        processing_id: faker.string.uuid(),
        data,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_processing_result_upload_file_service/PROCESSING_NOT_FOUND",
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
      workerGenerateProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
        data,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_processing_result_upload_file_service/PROCESSING_ALREADY_SUCCEEDED",
      }),
    );
  });

  it("should throw if the processing update failed", async () => {
    const worker = workerFactory.build();
    const processing = processingFactory.build({
      status: PROCESSING_STATUS.RUNNING,
      started_at: null,
    });

    const generatedFile = fileFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    storageProviderMock.generateUploadSignedUrl.mockResolvedValueOnce(
      generatedFile,
    );
    processingRepositoryMock.updateOne.mockResolvedValueOnce(
      processingFactory.build(),
    );

    await expect(() =>
      workerGenerateProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
        data,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_processing_result_upload_file_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
