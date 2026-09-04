import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingResultUploadFileService } from "./workerHandleProcessingResultUploadFile.service";

describe("Service: WorkerHandleProcessingResultUploadFileService", () => {
  let processingRepository: IProcessingRepository;

  let workerHandleProcessingResultUploadFileService: WorkerHandleProcessingResultUploadFileService;

  beforeEach(() => {
    processingRepository = container.resolve("ProcessingRepository");

    workerHandleProcessingResultUploadFileService =
      new WorkerHandleProcessingResultUploadFileService(processingRepository);
  });

  const buildPublicFile = () =>
    fileFactory.create({
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: faker.internet.url(),
      public_url_expires_at: faker.date.future(),
      provider_status: FILE_PROVIDER_STATUS.READY,
    });

  it("should confirm the result file upload", async () => {
    const worker = await workerFactory.create();
    const resultFile = await buildPublicFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      result_file_id: resultFile.id,
      worker_id: null,
    });

    const response =
      await workerHandleProcessingResultUploadFileService.execute({
        worker,
        processing_id: processing.id,
      });

    expect(response).toEqual(expect.objectContaining({ id: resultFile.id }));

    const updated = await processingRepository.findOne({ id: processing.id });
    expect(updated?.worker_id).toBe(worker.id);
    expect(updated?.status).toBe(PROCESSING_STATUS.RUNNING);
  });

  it("should throw if the processing was not found", async () => {
    const worker = await workerFactory.create();

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
    const worker = await workerFactory.create();
    const processing = await processingFactory.create();
    // The factory always backfills a nullish result_file_id with a fresh
    // file association, so the "no file" state has to be forced afterwards.
    await processingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null },
    );

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
    const worker = await workerFactory.create();
    const resultFile = await fileFactory.create({
      allow_public_access: false,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: null,
      public_url_expires_at: null,
    });
    const processing = await processingFactory.create({
      result_file_id: resultFile.id,
    });

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
    const worker = await workerFactory.create();
    const resultFile = await fileFactory.create({
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: faker.internet.url(),
      public_url_expires_at: faker.date.future(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
    });
    const processing = await processingFactory.create({
      result_file_id: resultFile.id,
    });

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
});
