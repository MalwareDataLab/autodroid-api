import { beforeEach, describe, expect, it } from "vitest";

// Config import
import { getAdminConfig } from "@config/admin";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Service import
import { AdminWorkerIndexService } from "./adminWorkerIndex.service";

describe("Service: AdminWorkerIndexService", () => {
  let adminWorkerIndexService: AdminWorkerIndexService;

  beforeEach(context => {
    adminWorkerIndexService = context.container.resolve(
      AdminWorkerIndexService,
    );
  });

  it("should list workers", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const worker = await workerFactory.create();

    const response = await adminWorkerIndexService.execute({
      filter: {},
      user: admin,
      language: "en",
    });

    expect(response.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: worker.id }),
        }),
      ]),
    );
  });

  it("should return an empty page when there are no workers", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    const response = await adminWorkerIndexService.execute({
      filter: {},
      user: admin,
      language: "en",
    });

    expect(response.edges).toEqual([]);
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerIndexService.execute({
        filter: {},
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
