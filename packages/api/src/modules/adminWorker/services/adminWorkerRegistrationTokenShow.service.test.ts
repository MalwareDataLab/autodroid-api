import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getAdminConfig } from "@config/admin";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Service import
import { AdminWorkerRegistrationTokenShowService } from "./adminWorkerRegistrationTokenShow.service";

describe("Service: AdminWorkerRegistrationTokenShowService", () => {
  let adminWorkerRegistrationTokenShowService: AdminWorkerRegistrationTokenShowService;

  beforeEach(context => {
    adminWorkerRegistrationTokenShowService = context.container.resolve(
      AdminWorkerRegistrationTokenShowService,
    );
  });

  it("should show a worker registration token", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const workerRegistrationToken = await workerRegistrationTokenFactory.create();

    const response = await adminWorkerRegistrationTokenShowService.execute({
      worker_registration_token_id: workerRegistrationToken.id,
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({ id: workerRegistrationToken.id });
  });

  it("should throw if the worker registration token was not found", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminWorkerRegistrationTokenShowService.execute({
        worker_registration_token_id: faker.string.uuid(),
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_registration_token_show_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerRegistrationTokenShowService.execute({
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
