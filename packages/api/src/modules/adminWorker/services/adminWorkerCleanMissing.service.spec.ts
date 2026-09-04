import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Service import
import { AdminWorkerCleanMissingService } from "./adminWorkerCleanMissing.service";

describe("Service: AdminWorkerCleanMissingService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let adminWorkerCleanMissingService: AdminWorkerCleanMissingService;

  beforeEach(() => {
    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminWorkerCleanMissingService = new AdminWorkerCleanMissingService(
      workerRepositoryMock,
    );
  });

  it("should clean missing workers", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const worker = workerFactory.build();

    workerRepositoryMock.findMany.mockResolvedValueOnce([worker]);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(worker);

    const response = await adminWorkerCleanMissingService.execute({
      user,
      language: "en",
    });

    expect(response).toBe(1);
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminWorkerCleanMissingService.execute({
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
