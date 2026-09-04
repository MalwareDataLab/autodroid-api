import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerProcessingShowService } from "@modules/worker/services/workerProcessingShow.service";
import { WorkerHandleProcessingSuccessService } from "@modules/worker/services/workerHandleProcessingSuccess.service";
import { WorkerHandleProcessingFailureService } from "@modules/worker/services/workerHandleProcessingFailure.service";
import { WorkerHandleProcessingProgressService } from "@modules/worker/services/workerHandleProcessingProgress.service";

// Target import
import { WorkerProcessingController } from "./workerProcessing.controller";

describe("Controller: WorkerProcessingController", () => {
  const worker = workerFactory.build();
  const processing = processingFactory.build();

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
    expect(response.json).toHaveBeenCalledWith(process(processing));
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
    expect(response.json).toHaveBeenCalledWith(process(processing));
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
    expect(response.json).toHaveBeenCalledWith(process(processing));
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
    expect(response.json).toHaveBeenCalledWith(process(processing));
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
