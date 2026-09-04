import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Util import
import { logger } from "@shared/utils/logger";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Service import
import { WorkerCleanMissingService } from "./workerCleanMissing.service";

vi.mock("@shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("Service: WorkerCleanMissingService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let workerCleanMissingService: WorkerCleanMissingService;

  beforeEach(() => {
    vi.clearAllMocks();

    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    workerCleanMissingService = new WorkerCleanMissingService(
      workerRepositoryMock,
    );
  });

  it("should mark missing workers and return the count", async () => {
    const worker = workerFactory.build();

    workerRepositoryMock.findMany.mockResolvedValueOnce([worker]);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(worker);

    const response = await workerCleanMissingService.execute();

    expect(response).toBe(1);
    expect(workerRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: worker.id },
      { missing: true },
    );
  });

  it("should log and skip a worker that fails to update", async () => {
    const worker = workerFactory.build();

    workerRepositoryMock.findMany.mockResolvedValueOnce([worker]);
    workerRepositoryMock.updateOne.mockRejectedValueOnce(new Error("failed"));

    const response = await workerCleanMissingService.execute();

    expect(response).toBe(0);
    expect(logger.error).toHaveBeenCalled();
  });
});
