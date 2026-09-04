import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerHandleProcessingResultUploadFileService } from "@modules/worker/services/workerHandleProcessingResultUploadFile.service";
import { WorkerGenerateProcessingResultUploadFileService } from "@modules/worker/services/workerGenerateProcessingResultUploadFile.service";

// Target import
import { WorkerProcessingResultFileController } from "./workerProcessingResultFile.controller";

describe("Controller: WorkerProcessingResultFileController", () => {
  const worker = workerFactory.build();
  const processing = processingFactory.build();
  const file = fileFactory.build();

  const agent_info = { ip: "10.0.0.3", browser: "worker-agent" };

  let workerGenerateProcessingResultUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let workerHandleProcessingResultUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let workerProcessingResultFileController: WorkerProcessingResultFileController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      worker_session: { worker },
      params: { processing_id: processing.id },
      body: {},
      agent_info,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    workerGenerateProcessingResultUploadFileService = { execute: vi.fn() };
    workerHandleProcessingResultUploadFileService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerGenerateProcessingResultUploadFileService)
        return workerGenerateProcessingResultUploadFileService;
      if (token === WorkerHandleProcessingResultUploadFileService)
        return workerHandleProcessingResultUploadFileService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerProcessingResultFileController =
      new WorkerProcessingResultFileController();
  });

  it("should generate the result upload file forwarding the body and the agent info", async () => {
    const body = { filename: "result.zip", size: 2048 };
    workerGenerateProcessingResultUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result = await workerProcessingResultFileController.create(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(
      workerGenerateProcessingResultUploadFileService.execute,
    ).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
      data: body,
      agent_info,
    });
    expect(response.json).toHaveBeenCalledWith(process(file));
    expect(result).toBe(response);
  });

  it("should propagate a failure generating the result upload file", async () => {
    const error = new Error("generate failed");
    workerGenerateProcessingResultUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingResultFileController.create(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should handle the result upload without forwarding the body nor the agent info", async () => {
    workerHandleProcessingResultUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result = await workerProcessingResultFileController.update(
      buildRequest({ body: { ignored: true } }),
      response as unknown as Response,
    );

    expect(
      workerHandleProcessingResultUploadFileService.execute,
    ).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
    });
    expect(response.json).toHaveBeenCalledWith(process(file));
    expect(result).toBe(response);
  });

  it("should propagate a failure handling the result upload", async () => {
    const error = new Error("handle failed");
    workerHandleProcessingResultUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingResultFileController.update(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});
