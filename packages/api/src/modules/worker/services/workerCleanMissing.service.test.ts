import { describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Util import
import { logger } from "@shared/utils/logger";
import { DateUtils } from "@shared/utils/dateUtils";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";

// Service import
import { WorkerCleanMissingService } from "./workerCleanMissing.service";

vi.mock("@shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("Service: WorkerCleanMissingService", () => {
  const buildService = () =>
    new WorkerCleanMissingService(
      container.resolve<IWorkerRepository>("WorkerRepository"),
    );

  it("should mark stale workers as missing and return the count", async () => {
    const stale = await workerFactory.create({
      missing: false,
      last_seen_at: DateUtils.now().subtract(10, "days").toDate(),
    });
    const recent = await workerFactory.create({
      missing: false,
      last_seen_at: DateUtils.now().subtract(1, "days").toDate(),
    });

    const response = await buildService().execute();

    expect(response).toBe(1);

    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    const updatedStale = await workerRepository.findOne({ id: stale.id });
    const updatedRecent = await workerRepository.findOne({ id: recent.id });

    expect(updatedStale?.missing).toBe(true);
    expect(updatedRecent?.missing).toBe(false);
  });

  it("should return 0 and not throw when there is nothing stale to clean", async () => {
    await workerFactory.create({
      missing: false,
      last_seen_at: DateUtils.now().subtract(1, "days").toDate(),
    });

    const response = await buildService().execute();

    expect(response).toBe(0);
  });

  it("should log and skip a worker that fails to update", async () => {
    vi.clearAllMocks();

    const stale = await workerFactory.create({
      missing: false,
      last_seen_at: DateUtils.now().subtract(10, "days").toDate(),
    });

    const workerRepository =
      container.resolve<IWorkerRepository>("WorkerRepository");
    vi.spyOn(workerRepository, "updateOne").mockRejectedValueOnce(
      new Error("failed"),
    );

    const response = await buildService().execute();

    expect(response).toBe(0);
    expect(logger.error).toHaveBeenCalled();

    const untouched = await workerRepository.findOne({ id: stale.id });
    expect(untouched?.missing).toBe(false);
  });
});
