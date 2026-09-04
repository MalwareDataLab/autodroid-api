import { describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerGenerateProcessingMetricsUploadFileService } from "./workerGenerateProcessingMetricsUploadFile.service";

describe("Service: WorkerGenerateProcessingMetricsUploadFileService", () => {
  const data: RequestFileUploadSignedUrlSchema = {
    filename: "metrics.csv",
    mime_type: MIME_TYPE.CSV,
    size: 1024,
    md5_hash: faker.string.hexadecimal({ length: 32, prefix: "" }),
  };

  const buildService = () =>
    new WorkerGenerateProcessingMetricsUploadFileService(
      container.resolve<IProcessingRepository>("ProcessingRepository"),
      container.resolve<IStorageProvider>("StorageProvider"),
    );

  it("should generate a metrics upload url and remove the previous metrics file", async () => {
    const worker = await workerFactory.create();
    const previous_metrics_file = await fileFactory.create({
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: new Date(),
      metrics_file_id: previous_metrics_file.id,
    });

    const generatedFile = await fileFactory.create({
      type: FILE_TYPE.PROCESSING_METRICS,
    });

    const storageProvider =
      container.resolve<IStorageProvider>("StorageProvider");
    const removeFileByPathSpy = vi.spyOn(storageProvider, "removeFileByPath");
    vi.spyOn(storageProvider, "generateUploadSignedUrl").mockResolvedValueOnce(
      generatedFile,
    );

    const response = await buildService().execute({
      worker,
      processing_id: processing.id,
      data,
    });

    expect(response.id).toBe(generatedFile.id);
    expect(removeFileByPathSpy).toHaveBeenCalledWith({
      path: previous_metrics_file.provider_path,
      language: expect.any(String),
    });

    const processingRepository =
      container.resolve<IProcessingRepository>("ProcessingRepository");
    const updated = await processingRepository.findOne({ id: processing.id });
    expect(updated?.status).toBe(PROCESSING_STATUS.RUNNING);
    expect(updated?.worker_id).toBe(worker.id);
  });

  it("should generate a metrics upload url without a previous metrics file", async () => {
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: null,
    });

    // processingFactory.create() auto-populates optional file/worker relations
    // it isn't given explicitly (see loadEntityRelations) — force this one back
    // to genuinely null so the "no previous file" branch is actually exercised.
    const processingRepository =
      container.resolve<IProcessingRepository>("ProcessingRepository");
    await processingRepository.updateOne(
      { id: processing.id },
      { metrics_file_id: null },
    );

    const generatedFile = await fileFactory.create({
      type: FILE_TYPE.PROCESSING_METRICS,
    });

    const storageProvider =
      container.resolve<IStorageProvider>("StorageProvider");
    const removeFileByPathSpy = vi.spyOn(storageProvider, "removeFileByPath");
    vi.spyOn(storageProvider, "generateUploadSignedUrl").mockResolvedValueOnce(
      generatedFile,
    );

    const response = await buildService().execute({
      worker,
      processing_id: processing.id,
      data,
    });

    expect(response.id).toBe(generatedFile.id);
    expect(removeFileByPathSpy).not.toHaveBeenCalled();
  });

  it("should throw if the processing was not found", async () => {
    const worker = await workerFactory.create();

    await expect(() =>
      buildService().execute({
        worker,
        processing_id: faker.string.uuid(),
        data,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_processing_metrics_upload_file_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the processing already succeeded and is complete", async () => {
    const worker = await workerFactory.create();
    const metrics_file = await fileFactory.create({
      public_url: faker.internet.url(),
    });
    const result_file = await fileFactory.create({
      public_url: faker.internet.url(),
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.SUCCEEDED,
      metrics_file_id: metrics_file.id,
      result_file_id: result_file.id,
    });

    await expect(() =>
      buildService().execute({
        worker,
        processing_id: processing.id,
        data,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_processing_metrics_upload_file_service/PROCESSING_ALREADY_SUCCEEDED",
      }),
    );
  });

  it("should throw if the processing was not updated", async () => {
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: null,
    });

    const generatedFile = await fileFactory.create({
      type: FILE_TYPE.PROCESSING_METRICS,
    });

    const storageProvider =
      container.resolve<IStorageProvider>("StorageProvider");
    vi.spyOn(storageProvider, "generateUploadSignedUrl").mockResolvedValueOnce(
      generatedFile,
    );

    const processingRepository =
      container.resolve<IProcessingRepository>("ProcessingRepository");
    vi.spyOn(processingRepository, "updateOne").mockResolvedValueOnce(null);

    await expect(() =>
      buildService().execute({
        worker,
        processing_id: processing.id,
        data,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_generate_processing_metrics_upload_file_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
