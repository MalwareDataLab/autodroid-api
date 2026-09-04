import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Service import
import { WorkerGenerateProcessingResultUploadFileService } from "@modules/worker/services/workerGenerateProcessingResultUploadFile.service";
import { WorkerHandleProcessingResultUploadFileService } from "@modules/worker/services/workerHandleProcessingResultUploadFile.service";
import { WorkerGenerateProcessingMetricsUploadFileService } from "@modules/worker/services/workerGenerateProcessingMetricsUploadFile.service";
import { WorkerHandleProcessingMetricsUploadFileService } from "@modules/worker/services/workerHandleProcessingMetricsUploadFile.service";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";

// Target import
import { WorkerProcessingFileResolver } from "./workerProcessingFile.resolver";

describe("Resolver: WorkerProcessingFileResolver", () => {
  const worker = workerFactory.build();
  const processing = processingFactory.build();
  const file = fileFactory.build();

  const agent_info = { ip: "127.0.0.1" } as IParsedUserAgentInfoDTO;

  const graphQLContext = {
    agent_info,
    worker_session: { worker },
  } as GraphQLContext;

  const data = {
    filename: "result.zip",
    mime_type: MIME_TYPE.CSV,
    size: 2048,
  } as RequestFileUploadSignedUrlSchema;

  let workerGenerateProcessingResultUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let workerHandleProcessingResultUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let workerGenerateProcessingMetricsUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let workerHandleProcessingMetricsUploadFileService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let workerProcessingFileResolver: WorkerProcessingFileResolver;

  beforeEach(() => {
    workerGenerateProcessingResultUploadFileService = { execute: vi.fn() };
    workerHandleProcessingResultUploadFileService = { execute: vi.fn() };
    workerGenerateProcessingMetricsUploadFileService = { execute: vi.fn() };
    workerHandleProcessingMetricsUploadFileService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerGenerateProcessingResultUploadFileService)
        return workerGenerateProcessingResultUploadFileService;
      if (token === WorkerHandleProcessingResultUploadFileService)
        return workerHandleProcessingResultUploadFileService;
      if (token === WorkerGenerateProcessingMetricsUploadFileService)
        return workerGenerateProcessingMetricsUploadFileService;
      if (token === WorkerHandleProcessingMetricsUploadFileService)
        return workerHandleProcessingMetricsUploadFileService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerProcessingFileResolver = new WorkerProcessingFileResolver();
  });

  it("should generate the result file upload", async () => {
    workerGenerateProcessingResultUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result =
      await workerProcessingFileResolver.workerProcessingGenerateResultFileUpload(
        data,
        processing.id,
        graphQLContext,
      );

    expect(
      workerGenerateProcessingResultUploadFileService.execute,
    ).toHaveBeenCalledWith({
      processing_id: processing.id,
      data,
      worker,
      agent_info,
    });
    expect(result).toBe(file);
  });

  it("should propagate a failure generating the result file upload", async () => {
    const error = new Error("generate result failed");
    workerGenerateProcessingResultUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingFileResolver.workerProcessingGenerateResultFileUpload(
        data,
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should capture the result file upload without the agent info", async () => {
    workerHandleProcessingResultUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result =
      await workerProcessingFileResolver.workerProcessingCaptureResultFileUpload(
        processing.id,
        graphQLContext,
      );

    expect(
      workerHandleProcessingResultUploadFileService.execute,
    ).toHaveBeenCalledWith({
      processing_id: processing.id,
      worker,
    });
    expect(result).toBe(file);
  });

  it("should propagate a failure capturing the result file upload", async () => {
    const error = new Error("capture result failed");
    workerHandleProcessingResultUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingFileResolver.workerProcessingCaptureResultFileUpload(
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should generate the metrics file upload", async () => {
    workerGenerateProcessingMetricsUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result =
      await workerProcessingFileResolver.workerProcessingGenerateMetricsFileUpload(
        data,
        processing.id,
        graphQLContext,
      );

    expect(
      workerGenerateProcessingMetricsUploadFileService.execute,
    ).toHaveBeenCalledWith({
      processing_id: processing.id,
      data,
      worker,
      agent_info,
    });
    expect(result).toBe(file);
  });

  it("should propagate a failure generating the metrics file upload", async () => {
    const error = new Error("generate metrics failed");
    workerGenerateProcessingMetricsUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingFileResolver.workerProcessingGenerateMetricsFileUpload(
        data,
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should capture the metrics file upload without the agent info", async () => {
    workerHandleProcessingMetricsUploadFileService.execute.mockResolvedValueOnce(
      file,
    );

    const result =
      await workerProcessingFileResolver.workerProcessingCaptureMetricsFileUpload(
        processing.id,
        graphQLContext,
      );

    expect(
      workerHandleProcessingMetricsUploadFileService.execute,
    ).toHaveBeenCalledWith({
      processing_id: processing.id,
      worker,
    });
    expect(result).toBe(file);
  });

  it("should propagate a failure capturing the metrics file upload", async () => {
    const error = new Error("capture metrics failed");
    workerHandleProcessingMetricsUploadFileService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      workerProcessingFileResolver.workerProcessingCaptureMetricsFileUpload(
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});
