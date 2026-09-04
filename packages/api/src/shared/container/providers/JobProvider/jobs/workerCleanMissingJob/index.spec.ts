import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Service import
import { WorkerCleanMissingService } from "@modules/worker/services/workerCleanMissing.service";

// Test target import
import { IWorkerCleanMissingJob, WorkerCleanMissingJob } from ".";

describe("Job: WorkerCleanMissingJob", () => {
  let workerCleanMissingService: { execute: ReturnType<typeof vi.fn> };
  let done: ReturnType<typeof vi.fn>;

  let workerCleanMissingJob: WorkerCleanMissingJob;

  const buildJob = () =>
    ({ data: undefined }) as unknown as Job<IWorkerCleanMissingJob>;

  beforeEach(() => {
    workerCleanMissingService = { execute: vi.fn() };
    done = vi.fn();

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerCleanMissingService) return workerCleanMissingService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerCleanMissingJob = new WorkerCleanMissingJob();
  });

  it("should report how many missing workers were removed", async () => {
    workerCleanMissingService.execute.mockResolvedValueOnce(2);

    await workerCleanMissingJob.handle(buildJob(), done);

    expect(workerCleanMissingService.execute).toHaveBeenCalledWith();
    expect(done).toHaveBeenCalledWith(null, "Removed 2 missing workers.");
  });

  it("should finish with an application error when the cleanup fails", async () => {
    const failure = new Error("worker repository is down");
    workerCleanMissingService.execute.mockRejectedValueOnce(failure);

    await workerCleanMissingJob.handle(buildJob(), done);

    expect(done).toHaveBeenCalledOnce();
    const [error] = done.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.key).toBe("@worker_clean_missing_job/ERROR");
    expect(error.message).toBe(
      "Fail to cleanup workers. worker repository is down",
    );
    expect(error.debug.error).toBe(failure);
  });

  it("should do nothing when the job definitively fails", async () => {
    await expect(
      workerCleanMissingJob.onFailed(buildJob(), new Error("exhausted")),
    ).resolves.toBeUndefined();
  });
});
