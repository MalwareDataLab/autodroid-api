import { describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Service import
import { WorkerHandleProcessingFailureService } from "./workerHandleProcessingFailure.service";

describe("Service: WorkerHandleProcessingFailureService", () => {
  const buildService = () =>
    new WorkerHandleProcessingFailureService(
      container.resolve<IProcessingRepository>("ProcessingRepository"),
      container.resolve<IJobProvider>("JobProvider"),
    );

  it("should mark the processing as failed with the provided reason", async () => {
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: new Date(),
      reported_at: new Date(),
    });

    const response = await buildService().execute({
      worker,
      processing_id: processing.id,
      data: { reason: "boom" },
    });

    expect(response.status).toBe(PROCESSING_STATUS.FAILED);
    expect(response.message).toBe("boom");
    expect(response.worker_id).toBe(worker.id);
    expect(response.finished_at).toBeInstanceOf(Date);
  });

  it("should report the failure by email when notifications are enabled and not yet reported", async () => {
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: new Date(),
      reported_at: null,
    });

    const jobProvider = container.resolve<IJobProvider>("JobProvider");
    const addSpy = vi.spyOn(jobProvider, "add");

    await buildService().execute({
      worker,
      processing_id: processing.id,
      data: { reason: "boom" },
    });

    expect(addSpy).toHaveBeenCalledWith(
      "SendEmailNotificationJob",
      expect.objectContaining({
        to: expect.arrayContaining([
          expect.objectContaining({ email: processing.user.email }),
        ]),
      }),
    );
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
        key: "@worker_handle_processing_failure_service/PROCESSING_NOT_FOUND",
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
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_handle_processing_failure_service/PROCESSING_ALREADY_SUCCEEDED",
      }),
    );
  });

  it("should throw if the processing was not updated", async () => {
    const worker = await workerFactory.create();
    const processing = await processingFactory.create({
      status: PROCESSING_STATUS.RUNNING,
      started_at: null,
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
        key: "@worker_handle_processing_failure_service/PROCESSING_UPDATE_FAILED",
      }),
    );
  });
});
