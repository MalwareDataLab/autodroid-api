import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Service import
import { ProcessingCleanExpiredService } from "@modules/processing/services/processingCleanExpired.service";

// Test target import
import { IProcessingCleanExpiredJob, ProcessingCleanExpiredJob } from ".";

describe("Job: ProcessingCleanExpiredJob", () => {
  let processingCleanExpiredService: { execute: ReturnType<typeof vi.fn> };
  let done: ReturnType<typeof vi.fn>;

  let processingCleanExpiredJob: ProcessingCleanExpiredJob;

  const buildJob = () =>
    ({ data: undefined }) as unknown as Job<IProcessingCleanExpiredJob>;

  beforeEach(() => {
    processingCleanExpiredService = { execute: vi.fn() };
    done = vi.fn();

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === ProcessingCleanExpiredService)
        return processingCleanExpiredService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    processingCleanExpiredJob = new ProcessingCleanExpiredJob();
  });

  it("should report how many expired processes were removed", async () => {
    processingCleanExpiredService.execute.mockResolvedValueOnce(3);

    await processingCleanExpiredJob.handle(buildJob(), done);

    expect(processingCleanExpiredService.execute).toHaveBeenCalledWith();
    expect(done).toHaveBeenCalledWith(null, "Removed 3 expired processes.");
  });

  it("should finish with an application error when the cleanup fails", async () => {
    const failure = new Error("cleanup failed");
    processingCleanExpiredService.execute.mockRejectedValueOnce(failure);

    await processingCleanExpiredJob.handle(buildJob(), done);

    expect(done).toHaveBeenCalledOnce();
    const [error] = done.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.key).toBe("@processing_clean_expired_job/ERROR");
    expect(error.message).toBe("Fail to cleanup processes. cleanup failed");
    expect(error.debug.error).toBe(failure);
  });

  it("should do nothing when the job definitively fails", async () => {
    await expect(
      processingCleanExpiredJob.onFailed(buildJob(), new Error("exhausted")),
    ).resolves.toBeUndefined();
  });
});
