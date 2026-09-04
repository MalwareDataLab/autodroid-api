import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Service import
import { AdminWorkerShowService } from "./adminWorkerShow.service";

describe("Service: AdminWorkerShowService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let adminWorkerShowService: AdminWorkerShowService;

  beforeEach(() => {
    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminWorkerShowService = new AdminWorkerShowService(workerRepositoryMock);
  });

  it("should show a worker", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const worker = workerFactory.build();

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    const response = await adminWorkerShowService.execute({
      worker_id: worker.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(worker);
  });

  it("should throw if the worker was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    workerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminWorkerShowService.execute({
        worker_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_show_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminWorkerShowService.execute({
        worker_id: faker.string.uuid(),
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
