import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { container } from "tsyringe";
import { Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Factory import
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Provider import
import { IDatasetProcessorProvider } from "@shared/container/providers/DatasetProcessorProvider/models/IDatasetProcessor.provider";

// Service import
import { ProcessingHandleFailureService } from "@modules/processing/services/processingHandleFailure.service";

// Test target import
import { DispatchDatasetProcessingJob, IDispatchDatasetProcessingJob } from ".";

describe("Job: DispatchDatasetProcessingJob", () => {
  let datasetProcessorProvider: Mocked<IDatasetProcessorProvider>;
  let processingHandleFailureService: { execute: ReturnType<typeof vi.fn> };
  let done: ReturnType<typeof vi.fn>;

  let dispatchDatasetProcessingJob: DispatchDatasetProcessingJob;

  const buildJob = (processing_ids: string[], attemptsMade = 0) =>
    ({
      data: { processing_ids },
      attemptsMade,
    }) as unknown as Job<IDispatchDatasetProcessingJob>;

  beforeEach(() => {
    datasetProcessorProvider = {
      initialization: Promise.resolve(),
      dispatchNotStartedProcesses: vi.fn(),
    };
    processingHandleFailureService = { execute: vi.fn() };
    done = vi.fn();

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === "DatasetProcessorProvider") return datasetProcessorProvider;
      if (token === ProcessingHandleFailureService)
        return processingHandleFailureService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    dispatchDatasetProcessingJob = new DispatchDatasetProcessingJob();
  });

  it("should dispatch the processes and report the outcome of each group", async () => {
    datasetProcessorProvider.dispatchNotStartedProcesses.mockResolvedValueOnce({
      dispatched: [processingFactory.build(), processingFactory.build()],
      failed: [processingFactory.build()],
      skipped: [],
    });

    await dispatchDatasetProcessingJob.handle(
      buildJob(["processing-1", "processing-2"]),
      done,
    );

    expect(
      datasetProcessorProvider.dispatchNotStartedProcesses,
    ).toHaveBeenCalledWith({
      processing_ids: ["processing-1", "processing-2"],
    });
    expect(done).toHaveBeenCalledWith(
      null,
      "Dispatched 2 processes, 1 failed, and 0 skipped.",
    );
  });

  it("should finish with an application error naming the single process when the dispatch fails", async () => {
    datasetProcessorProvider.dispatchNotStartedProcesses.mockRejectedValueOnce(
      new Error("worker is unreachable"),
    );

    await dispatchDatasetProcessingJob.handle(buildJob(["processing-1"]), done);

    expect(done).toHaveBeenCalledOnce();
    const [error] = done.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.key).toBe("@dispatch_dataset_processing_job/ERROR");
    expect(error.message).toBe(
      "Unable to dispatch processes originated from processing-1. worker is unreachable",
    );
  });

  it("should finish with an application error counting the remaining processes when the dispatch fails", async () => {
    datasetProcessorProvider.dispatchNotStartedProcesses.mockRejectedValueOnce(
      new Error("worker is unreachable"),
    );

    await dispatchDatasetProcessingJob.handle(
      buildJob(["processing-1", "processing-2", "processing-3"]),
      done,
    );

    const [error] = done.mock.calls[0];
    expect(error.message).toBe(
      "Unable to dispatch processes originated from processing-1 and 2. worker is unreachable",
    );
  });

  it("should not fail the processes while attempts remain", async () => {
    await dispatchDatasetProcessingJob.onFailed(
      buildJob(["processing-1"], 1439),
      new Error("worker is unreachable"),
    );

    expect(processingHandleFailureService.execute).not.toHaveBeenCalled();
  });

  it("should fail the single process once the attempts are exhausted", async () => {
    await dispatchDatasetProcessingJob.onFailed(
      buildJob(["processing-1"], 1440),
      new Error("worker is unreachable"),
    );

    expect(processingHandleFailureService.execute).toHaveBeenCalledWith({
      processing_ids: ["processing-1"],
      message:
        "Fail to dispatch processing processing-1 after 1440 attempts. worker is unreachable",
    });
  });

  it("should fail every process counting the remaining ones once the attempts are exhausted", async () => {
    await dispatchDatasetProcessingJob.onFailed(
      buildJob(["processing-1", "processing-2", "processing-3"], 1441),
      new Error("worker is unreachable"),
    );

    expect(processingHandleFailureService.execute).toHaveBeenCalledWith({
      processing_ids: ["processing-1", "processing-2", "processing-3"],
      message:
        "Fail to dispatch processing processing-1 and 2 more after 1441 attempts. worker is unreachable",
    });
  });
});
