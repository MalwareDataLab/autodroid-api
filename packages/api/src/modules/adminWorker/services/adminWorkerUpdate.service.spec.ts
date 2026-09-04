import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Service import
import { AdminWorkerUpdateService } from "./adminWorkerUpdate.service";

describe("Service: AdminWorkerUpdateService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let adminWorkerUpdateService: AdminWorkerUpdateService;

  beforeEach(() => {
    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminWorkerUpdateService = new AdminWorkerUpdateService(
      workerRepositoryMock,
    );
  });

  it("should update a worker with valid tags", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const worker = workerFactory.build();
    const updatedWorker = workerFactory.build({ tags: "one,two,three" });

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(updatedWorker);

    const response = await adminWorkerUpdateService.execute({
      worker_id: worker.id,
      data: { description: "Updated", tags: "one,two,three" },
      user,
      language: "en",
    });

    expect(response).toMatchObject(updatedWorker);
  });

  it("should update a worker without tags", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const worker = workerFactory.build();
    const updatedWorker = workerFactory.build();

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(updatedWorker);

    const response = await adminWorkerUpdateService.execute({
      worker_id: worker.id,
      data: { description: "Updated" },
      user,
      language: "en",
    });

    expect(response).toMatchObject(updatedWorker);
  });

  it("should throw if the worker was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    workerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminWorkerUpdateService.execute({
        worker_id: faker.string.uuid(),
        data: { description: "Updated" },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_update_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the tags are invalid", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const worker = workerFactory.build();

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);

    await expect(() =>
      adminWorkerUpdateService.execute({
        worker_id: worker.id,
        data: { tags: "one,two,three," },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_update_service/TAGS_NOT_PROVIDED",
      }),
    );
  });

  it("should throw if the worker was not updated", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const worker = workerFactory.build();

    workerRepositoryMock.findOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminWorkerUpdateService.execute({
        worker_id: worker.id,
        data: { description: "Updated" },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_update_service/WORKER_NOT_UPDATED",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminWorkerUpdateService.execute({
        worker_id: faker.string.uuid(),
        data: { description: "Updated" },
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
