import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Service import
import { ProcessingFailDanglingService } from "@modules/processing/services/processingFailDangling.service";

// Test target import
import { IProcessingFailDanglingJob, ProcessingFailDanglingJob } from ".";

describe("Job: ProcessingFailDanglingJob", () => {
  let processingFailDanglingService: { execute: ReturnType<typeof vi.fn> };
  let done: ReturnType<typeof vi.fn>;

  let processingFailDanglingJob: ProcessingFailDanglingJob;

  const buildJob = () =>
    ({ data: undefined }) as unknown as Job<IProcessingFailDanglingJob>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    processingFailDanglingService = { execute: vi.fn() };
    done = vi.fn();

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === ProcessingFailDanglingService)
        return processingFailDanglingService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    processingFailDanglingJob = new ProcessingFailDanglingJob();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should fail the pending processes older than a day", async () => {
    processingFailDanglingService.execute.mockResolvedValueOnce(5);

    await processingFailDanglingJob.handle(buildJob(), done);

    expect(processingFailDanglingService.execute).toHaveBeenCalledWith({
      created_at_end_date: new Date("2026-03-09T12:00:00.000Z"),
      status: PROCESSING_STATUS.PENDING,
    });
    expect(done).toHaveBeenCalledWith(null, "Failed 5 dangling processes.");
  });

  it("should finish with an application error when the failing routine fails", async () => {
    const failure = new Error("processing repository is down");
    processingFailDanglingService.execute.mockRejectedValueOnce(failure);

    await processingFailDanglingJob.handle(buildJob(), done);

    expect(done).toHaveBeenCalledOnce();
    const [error] = done.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.key).toBe("@processing_fail_dangling_job/ERROR");
    expect(error.message).toBe(
      "Fail to fail dangling processes. processing repository is down",
    );
    expect(error.debug.error).toBe(failure);
  });

  it("should do nothing when the job definitively fails", async () => {
    await expect(
      processingFailDanglingJob.onFailed(buildJob(), new Error("exhausted")),
    ).resolves.toBeUndefined();
  });
});
