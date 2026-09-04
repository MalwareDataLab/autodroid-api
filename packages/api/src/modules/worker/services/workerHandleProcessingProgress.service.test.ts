import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingProgressService } from "./workerHandleProcessingProgress.service";

describe("Service: WorkerHandleProcessingProgressService", () => {
  let processingRepository: IProcessingRepository;

  let workerHandleProcessingProgressService: WorkerHandleProcessingProgressService;

  beforeEach(() => {
    processingRepository = container.resolve("ProcessingRepository");

    workerHandleProcessingProgressService =
      new WorkerHandleProcessingProgressService(processingRepository);
  });

  it("should update the processing progress", async () => {
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.PENDING,
      started_at: null,
      finished_at: null,
      worker_id: null,
    });

    const response = await workerHandleProcessingProgressService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toEqual(
      expect.objectContaining({
        id: processing.id,
        status: PROCESSING_STATUS.RUNNING,
        worker_id: worker.id,
        finished_at: null,
      }),
    );
    expect(response.started_at).not.toBeNull();
  });

  it("should return the processing when it already succeeded and is complete", async () => {
    const worker = await workerFactory.create();
    const publicFile = await fileFactory.create({
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: faker.internet.url(),
      public_url_expires_at: faker.date.future(),
    });
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.SUCCEEDED,
      result_file_id: publicFile.id,
      metrics_file_id: publicFile.id,
    });

    const response = await workerHandleProcessingProgressService.execute({
      worker,
      processing_id: processing.id,
    });

    expect(response).toEqual(expect.objectContaining({ id: processing.id }));

    const untouched = await processingRepository.findOne({
      id: processing.id,
    });
    expect(untouched?.worker_id).not.toBe(worker.id);
  });

  it("should throw if the processing was not found", async () => {
    const worker = await workerFactory.create();

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
});
