import { describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingMetricsUploadFileService } from "./workerHandleProcessingMetricsUploadFile.service";

describe("Service: WorkerHandleProcessingMetricsUploadFileService", () => {
  const buildService = () =>
    new WorkerHandleProcessingMetricsUploadFileService(
      container.resolve<IProcessingRepository>("ProcessingRepository"),
    );

  it("should confirm the metrics file upload", async () => {
    const worker = await workerFactory.create();
    const metrics_file = await fileFactory.create({
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: faker.internet.url(),
      public_url_expires_at: faker.date.future(),
      provider_status: FILE_PROVIDER_STATUS.READY,
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: new Date(),
      metrics_file_id: metrics_file.id,
    });

    const response = await buildService().execute({
      worker,
      processing_id: processing.id,
    });

    expect(response.id).toBe(metrics_file.id);

    const processingRepository =
      container.resolve<IProcessingRepository>("ProcessingRepository");
    const updated = await processingRepository.findOne({ id: processing.id });
    expect(updated?.status).toBe(PROCESSING_STATUS.RUNNING);
    expect(updated?.worker_id).toBe(worker.id);
  });

  it("should throw if the processing was not found", async () => {
    const worker = await workerFactory.create();

    await expect(() =>
      buildService().execute({
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
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
    });

    // processingFactory.create() auto-populates optional file/worker relations
    // it isn't given explicitly (see loadEntityRelations) — force this one back
    // to genuinely null so the "no metrics file" branch is actually exercised.
    const processingRepository =
      container.resolve<IProcessingRepository>("ProcessingRepository");
    await processingRepository.updateOne(
      { id: processing.id },
      { metrics_file_id: null },
    );

    await expect(() =>
      buildService().execute({
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
    const worker = await workerFactory.create();
    const metrics_file = await fileFactory.create({
      allow_public_access: false,
      upload_url: null,
      public_url: null,
      public_url_expires_at: null,
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      metrics_file_id: metrics_file.id,
    });

    await expect(() =>
      buildService().execute({
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
    const worker = await workerFactory.create();
    const metrics_file = await fileFactory.create({
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: faker.internet.url(),
      public_url_expires_at: faker.date.future(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      metrics_file_id: metrics_file.id,
    });

    await expect(() =>
      buildService().execute({
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
    const worker = await workerFactory.create();
    const metrics_file = await fileFactory.create({
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: faker.internet.url(),
      public_url_expires_at: faker.date.future(),
      provider_status: FILE_PROVIDER_STATUS.READY,
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: null,
      metrics_file_id: metrics_file.id,
    });

    const processingRepository =
      container.resolve<IProcessingRepository>("ProcessingRepository");
    vi.spyOn(processingRepository, "updateOne").mockResolvedValueOnce(null);

    await expect(() =>
      buildService().execute({
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
