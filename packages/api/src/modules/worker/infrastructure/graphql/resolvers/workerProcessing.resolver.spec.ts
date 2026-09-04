import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { WorkerProcessingShowService } from "@modules/worker/services/workerProcessingShow.service";
import { WorkerHandleProcessingProgressService } from "@modules/worker/services/workerHandleProcessingProgress.service";
import { WorkerHandleProcessingSuccessService } from "@modules/worker/services/workerHandleProcessingSuccess.service";
import { WorkerHandleProcessingFailureService } from "@modules/worker/services/workerHandleProcessingFailure.service";

// Target import
import { WorkerProcessingResolver } from "./workerProcessing.resolver";

describe("Resolver: WorkerProcessingResolver", () => {
  const worker = workerFactory.build();
  const processing = processingFactory.build();

  const graphQLContext = {
    worker_session: { worker },
  } as GraphQLContext;

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

  let workerProcessingResolver: WorkerProcessingResolver;

  beforeEach(() => {
    workerProcessingShowService = { execute: vi.fn() };
    workerHandleProcessingProgressService = { execute: vi.fn() };
    workerHandleProcessingSuccessService = { execute: vi.fn() };
    workerHandleProcessingFailureService = { execute: vi.fn() };

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

    workerProcessingResolver = new WorkerProcessingResolver();
  });

  it("should show a processing for the session worker", async () => {
    workerProcessingShowService.execute.mockResolvedValueOnce(processing);

    const result = await workerProcessingResolver.workerProcessing(
      processing.id,
      graphQLContext,
    );

    expect(workerProcessingShowService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      worker,
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure showing the processing", async () => {
    const error = new Error("show failed");
    workerProcessingShowService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingResolver.workerProcessing(processing.id, graphQLContext),
    ).rejects.toThrowError(error);
  });

  it("should register the processing progress", async () => {
    workerHandleProcessingProgressService.execute.mockResolvedValueOnce(
      processing,
    );

    const result =
      await workerProcessingResolver.workerProcessingRegisterProgress(
        processing.id,
        graphQLContext,
      );

    expect(workerHandleProcessingProgressService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      worker,
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure registering the processing progress", async () => {
    const error = new Error("progress failed");
    workerHandleProcessingProgressService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingResolver.workerProcessingRegisterProgress(
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should register the processing success", async () => {
    workerHandleProcessingSuccessService.execute.mockResolvedValueOnce(
      processing,
    );

    const result =
      await workerProcessingResolver.workerProcessingRegisterSuccess(
        processing.id,
        graphQLContext,
      );

    expect(workerHandleProcessingSuccessService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      worker,
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure registering the processing success", async () => {
    const error = new Error("success failed");
    workerHandleProcessingSuccessService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingResolver.workerProcessingRegisterSuccess(
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should register the processing failure", async () => {
    workerHandleProcessingFailureService.execute.mockResolvedValueOnce(
      processing,
    );

    const result =
      await workerProcessingResolver.workerProcessingRegisterFailure(
        processing.id,
        graphQLContext,
      );

    expect(workerHandleProcessingFailureService.execute).toHaveBeenCalledWith({
      processing_id: processing.id,
      worker,
    });
    expect(result).toBe(processing);
  });

  it("should propagate a failure registering the processing failure", async () => {
    const error = new Error("failure failed");
    workerHandleProcessingFailureService.execute.mockRejectedValueOnce(error);

    await expect(
      workerProcessingResolver.workerProcessingRegisterFailure(
        processing.id,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});
