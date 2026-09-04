import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Service import
import { RemoveAllDanglingFilesService } from "@modules/file/services/removeAllDanglingFiles.service";

// Test target import
import { IRemoveAllDanglingFilesJob, RemoveAllDanglingFilesJob } from ".";

describe("Job: RemoveAllDanglingFilesJob", () => {
  let removeAllDanglingFilesService: { execute: ReturnType<typeof vi.fn> };
  let done: ReturnType<typeof vi.fn>;

  let removeAllDanglingFilesJob: RemoveAllDanglingFilesJob;

  const buildJob = () =>
    ({ data: undefined }) as unknown as Job<IRemoveAllDanglingFilesJob>;

  beforeEach(() => {
    removeAllDanglingFilesService = { execute: vi.fn() };
    done = vi.fn();

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === RemoveAllDanglingFilesService)
        return removeAllDanglingFilesService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    removeAllDanglingFilesJob = new RemoveAllDanglingFilesJob();
  });

  it("should report how many dangling files were removed", async () => {
    removeAllDanglingFilesService.execute.mockResolvedValueOnce(7);

    await removeAllDanglingFilesJob.handle(buildJob(), done);

    expect(removeAllDanglingFilesService.execute).toHaveBeenCalledWith();
    expect(done).toHaveBeenCalledWith(null, "Removed 7 dangling files.");
  });

  it("should finish with an application error when the removal fails", async () => {
    const failure = new Error("storage is down");
    removeAllDanglingFilesService.execute.mockRejectedValueOnce(failure);

    await removeAllDanglingFilesJob.handle(buildJob(), done);

    expect(done).toHaveBeenCalledOnce();
    const [error] = done.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.key).toBe("@remove_all_dangling_files_job/ERROR");
    expect(error.message).toBe(
      "Fail to remove all dandling files. storage is down",
    );
    expect(error.debug.error).toBe(failure);
  });

  it("should do nothing when the job definitively fails", async () => {
    await expect(
      removeAllDanglingFilesJob.onFailed(buildJob(), new Error("exhausted")),
    ).resolves.toBeUndefined();
  });
});
