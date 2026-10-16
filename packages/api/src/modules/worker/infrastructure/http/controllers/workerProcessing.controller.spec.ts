import { Request, Response } from "express";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Util import
import { process } from "@shared/utils/instanceParser";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Service import
import { WorkerHandleProcessingFailureService } from "@modules/worker/services/workerHandleProcessingFailure.service";
import { WorkerHandleProcessingProgressService } from "@modules/worker/services/workerHandleProcessingProgress.service";
import { WorkerHandleProcessingSuccessService } from "@modules/worker/services/workerHandleProcessingSuccess.service";
import { WorkerProcessingShowService } from "@modules/worker/services/workerProcessingShow.service";

// Target import
import { WorkerProcessingController } from "./workerProcessing.controller";

describe("Controller: WorkerProcessingController", () => {
  const worker = workerFactory.build();
  const processing = processingFactory.build(
    {},
    {
      associations: {
        user: userFactory.build(),
        dataset: datasetFactory.build(
          {},
          { associations: { user: userFactory.build() } },
        ),
      },
    },
  );
  const processingWithHiddenOwners = Object.assign(
    new Processing(),
    processing,
    {
      user: null,
      dataset: Object.assign(new Dataset(), processing.dataset, { user: null }),
    },
  );

  let workerProcessingShowService: { execute: ReturnType<typeof vi.fn> };
  let workerHandleProcessingProgressService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let workerHandleProcessingSuccessService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let workerHandleProcessingFailureService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let workerProcessingController: WorkerProcessingController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      worker_session: { worker },
      params: { processing_id: processing.id },
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    workerProcessingShowService = { execute: vi.fn() };
    workerHandleProcessingProgressService = { execute: vi.fn() };
    workerHandleProcessingSuccessService = { execute: vi.fn() };
    workerHandleProcessingFailureService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerProcessingShowService)
        return workerProcessingShowService;
      if (token === WorkerHandleProcessingProgressService)
        return workerHandleProcessingProgressService;
      if (token === WorkerHandleProcessingSuccessService)
        return workerHandleProcessingSuccessService;
      if (token === WorkerHandleProcessingFailureService)
        return workerHandleProcessingFailureService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerProcessingController = new WorkerProcessingController();
  });

  it("should show the processing for the session worker", async () => {
    workerProcessingShowService.execute.mockResolvedValueOnce(processing);

    const result = await workerProcessingController.show(
      buildRequest(),
      response as unknown as Response,
    );

    expect(workerProcessingShowService.execute).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
    });
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithHiddenOwners),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure showing the processing", async () => {
    const error = new Error("show failed");
    workerProcessingShowService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingController.show(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should report the processing progress for the session worker", async () => {
    workerHandleProcessingProgressService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await workerProcessingController.progress(
      buildRequest(),
      response as unknown as Response,
    );

    expect(workerHandleProcessingProgressService.execute).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
    });
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithHiddenOwners),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure reporting the processing progress", async () => {
    const error = new Error("progress failed");
    workerHandleProcessingProgressService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingController.progress(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should report the processing success for the session worker", async () => {
    workerHandleProcessingSuccessService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await workerProcessingController.success(
      buildRequest(),
      response as unknown as Response,
    );

    expect(workerHandleProcessingSuccessService.execute).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
    });
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithHiddenOwners),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure reporting the processing success", async () => {
    const error = new Error("success failed");
    workerHandleProcessingSuccessService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingController.success(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should report the processing failure forwarding the whole body as data", async () => {
    const body = { message: "boom" };
    workerHandleProcessingFailureService.execute.mockResolvedValueOnce(
      processing,
    );

    const result = await workerProcessingController.failure(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(workerHandleProcessingFailureService.execute).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
      data: body,
    });
    expect(response.json).toHaveBeenCalledWith(
      process(processingWithHiddenOwners),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure reporting the processing failure", async () => {
    const error = new Error("failure report failed");
    workerHandleProcessingFailureService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingController.failure(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});
