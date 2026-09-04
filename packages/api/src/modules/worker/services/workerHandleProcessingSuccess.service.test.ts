import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingSuccessService } from "./workerHandleProcessingSuccess.service";

describe("Service: WorkerHandleProcessingSuccessService", () => {
  let processingRepository: IProcessingRepository;
  let jobProvider: IJobProvider;

  let workerHandleProcessingSuccessService: WorkerHandleProcessingSuccessService;

  beforeEach(() => {
    processingRepository = container.resolve("ProcessingRepository");
    jobProvider = container.resolve("JobProvider");

    workerHandleProcessingSuccessService =
      new WorkerHandleProcessingSuccessService(
        processingRepository,
        jobProvider,
      );
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

  it("should mark the processing as succeeded with both output files", async () => {
    const worker = await workerFactory.create();
    const resultFile = await buildPublicFile();
    const metricsFile = await buildPublicFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      result_file_id: resultFile.id,
      metrics_file_id: metricsFile.id,
      finished_at: null,
    });

    const response = await workerHandleProcessingSuccessService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toEqual(
      expect.objectContaining({
        id: processing.id,
        status: PROCESSING_STATUS.SUCCEEDED,
        worker_id: worker.id,
      }),
    );
    expect(response.finished_at).not.toBeNull();
  });

  it("should mark the processing as succeeded with only the metrics file", async () => {
    const worker = await workerFactory.create();
    const metricsFile = await buildPublicFile();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      metrics_file_id: metricsFile.id,
      finished_at: null,
    });
    // The factory always backfills a nullish result_file_id with a fresh
    // file association, so the "no result file" state has to be forced after.
    await processingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null },
    );

    const response = await workerHandleProcessingSuccessService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toEqual(
      expect.objectContaining({
        id: processing.id,
        status: PROCESSING_STATUS.SUCCEEDED,
      }),
    );
  });

  it("should throw if the processing was not found", async () => {
    const worker = await workerFactory.create();

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
    const worker = await workerFactory.create();
    const processing = await processingFactory.create();
    // The factory always backfills a nullish file id with a fresh file
    // association, so the "no files" state has to be forced afterwards.
    await processingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null, metrics_file_id: null },
    );

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
    const worker = await workerFactory.create();
    const notReadyFile = await fileFactory.create({
      allow_public_access: false,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: null,
      public_url_expires_at: null,
    });
    const processing = await processingFactory.create({
      result_file_id: notReadyFile.id,
      metrics_file_id: null,
    });

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
});
