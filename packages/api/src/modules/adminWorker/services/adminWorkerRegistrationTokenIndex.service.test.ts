import { beforeEach, describe, expect, it } from "vitest";

// Config import
import { getAdminConfig } from "@config/admin";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Service import
import { AdminWorkerRegistrationTokenIndexService } from "./adminWorkerRegistrationTokenIndex.service";

describe("Service: AdminWorkerRegistrationTokenIndexService", () => {
  let adminWorkerRegistrationTokenIndexService: AdminWorkerRegistrationTokenIndexService;

  beforeEach(context => {
    adminWorkerRegistrationTokenIndexService = context.container.resolve(
      AdminWorkerRegistrationTokenIndexService,
    );
  });

  it("should list worker registration tokens", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const workerRegistrationToken = await workerRegistrationTokenFactory.create();

    const response = await adminWorkerRegistrationTokenIndexService.execute({
      filter: {},
      user: admin,
      language: "en",
    });

    expect(response.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: workerRegistrationToken.id }),
        }),
      ]),
    );
  });

  it("should return an empty page when there are no tokens", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    const response = await adminWorkerRegistrationTokenIndexService.execute({
      filter: {},
      user: admin,
      language: "en",
    });

    expect(response.edges).toEqual([]);
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerRegistrationTokenIndexService.execute({
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
