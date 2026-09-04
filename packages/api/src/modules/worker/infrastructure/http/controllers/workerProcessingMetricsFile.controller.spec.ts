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
import { WorkerHandleProcessingMetricsUploadFileService } from "@modules/worker/services/workerHandleProcessingMetricsUploadFile.service";
import { WorkerGenerateProcessingMetricsUploadFileService } from "@modules/worker/services/workerGenerateProcessingMetricsUploadFile.service";

// Target import
import { WorkerProcessingMetricsFileController } from "./workerProcessingMetricsFile.controller";

describe("Controller: WorkerProcessingMetricsFileController", () => {
  const worker = workerFactory.build();
  const processing = processingFactory.build();
  const file = fileFactory.build();

  const agent_info = { ip: "10.0.0.2", browser: "worker-agent" };

  let workerGenerateProcessingMetricsUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let workerHandleProcessingMetricsUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let workerProcessingMetricsFileController: WorkerProcessingMetricsFileController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      worker_session: { worker },
      params: { processing_id: processing.id },
      body: {},
      agent_info,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    workerGenerateProcessingMetricsUploadFileService = { execute: vi.fn() };
    workerHandleProcessingMetricsUploadFileService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerGenerateProcessingMetricsUploadFileService)
        return workerGenerateProcessingMetricsUploadFileService;
      if (token === WorkerHandleProcessingMetricsUploadFileService)
        return workerHandleProcessingMetricsUploadFileService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerProcessingMetricsFileController =
      new WorkerProcessingMetricsFileController();
  });

  it("should generate the metrics upload file forwarding the body and the agent info", async () => {
    const body = { filename: "metrics.json", size: 128 };
    workerGenerateProcessingMetricsUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result = await workerProcessingMetricsFileController.create(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(
      workerGenerateProcessingMetricsUploadFileService.execute,
    ).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
      data: body,
      agent_info,
    });
    expect(response.json).toHaveBeenCalledWith(process(file));
    expect(result).toBe(response);
  });

  it("should propagate a failure generating the metrics upload file", async () => {
    const error = new Error("generate failed");
    workerGenerateProcessingMetricsUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingMetricsFileController.create(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should handle the metrics upload without forwarding the body nor the agent info", async () => {
    workerHandleProcessingMetricsUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result = await workerProcessingMetricsFileController.update(
      buildRequest({ body: { ignored: true } }),
      response as unknown as Response,
    );

    expect(
      workerHandleProcessingMetricsUploadFileService.execute,
    ).toHaveBeenCalledWith({
      worker,
      processing_id: processing.id,
    });
    expect(response.json).toHaveBeenCalledWith(process(file));
    expect(result).toBe(response);
  });

  it("should propagate a failure handling the metrics upload", async () => {
    const error = new Error("handle failed");
    workerHandleProcessingMetricsUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingMetricsFileController.update(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});
