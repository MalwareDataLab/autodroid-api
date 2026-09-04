import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getAdminConfig } from "@config/admin";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Service import
import { AdminWorkerDeleteService } from "./adminWorkerDelete.service";

describe("Service: AdminWorkerDeleteService", () => {
  let workerRepository: IWorkerRepository;
  let adminWorkerDeleteService: AdminWorkerDeleteService;

  beforeEach(context => {
    workerRepository = context.container.resolve("WorkerRepository");
    adminWorkerDeleteService = context.container.resolve(
      AdminWorkerDeleteService,
    );
  });

  it("should delete a worker", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const worker = await workerFactory.create();

    const response = await adminWorkerDeleteService.execute({
      worker_id: worker.id,
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({ id: worker.id });
    expect(response.archived_at).toBeInstanceOf(Date);
    await expect(
      workerRepository.findOne({ id: worker.id, archived: false }),
    ).resolves.toBeNull();
  });

  it("should throw if the worker was not found", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminWorkerDeleteService.execute({
        worker_id: faker.string.uuid(),
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_delete_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerDeleteService.execute({
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
