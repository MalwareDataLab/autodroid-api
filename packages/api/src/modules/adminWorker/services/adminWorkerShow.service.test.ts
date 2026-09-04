import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Config import
import { getAdminConfig } from "@config/admin";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Service import
import { AdminWorkerShowService } from "./adminWorkerShow.service";

describe("Service: AdminWorkerShowService", () => {
  let adminWorkerShowService: AdminWorkerShowService;

  beforeEach(context => {
    adminWorkerShowService = context.container.resolve(AdminWorkerShowService);
  });

  it("should show a worker", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const worker = await workerFactory.create();

    const response = await adminWorkerShowService.execute({
      worker_id: worker.id,
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({ id: worker.id });
  });

  it("should throw if the worker was not found", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminWorkerShowService.execute({
        worker_id: faker.string.uuid(),
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_show_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

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
