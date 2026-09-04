import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getAdminConfig } from "@config/admin";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Service import
import { AdminWorkerRegistrationTokenDeleteService } from "./adminWorkerRegistrationTokenDelete.service";

describe("Service: AdminWorkerRegistrationTokenDeleteService", () => {
  let workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository;
  let adminWorkerRegistrationTokenDeleteService: AdminWorkerRegistrationTokenDeleteService;

  beforeEach(context => {
    workerRegistrationTokenRepository = context.container.resolve(
      "WorkerRegistrationTokenRepository",
    );
    adminWorkerRegistrationTokenDeleteService = context.container.resolve(
      AdminWorkerRegistrationTokenDeleteService,
    );
  });

  it("should delete a worker registration token", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const workerRegistrationToken = await workerRegistrationTokenFactory.create();

    const response = await adminWorkerRegistrationTokenDeleteService.execute({
      worker_registration_token_id: workerRegistrationToken.id,
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({ id: workerRegistrationToken.id });
    expect(response.archived_at).toBeInstanceOf(Date);
    await expect(
      workerRegistrationTokenRepository.findOne({
        id: workerRegistrationToken.id,
        archived: false,
      }),
    ).resolves.toBeNull();
  });

  it("should throw if the worker registration token was not found", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminWorkerRegistrationTokenDeleteService.execute({
        worker_registration_token_id: faker.string.uuid(),
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_registration_token_delete_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerRegistrationTokenDeleteService.execute({
        worker_registration_token_id: faker.string.uuid(),
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
