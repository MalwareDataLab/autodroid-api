import { beforeEach, describe, expect, it } from "vitest";

// Config import
import { getAdminConfig } from "@config/admin";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminWorkerRegistrationTokenCreateService } from "./adminWorkerRegistrationTokenCreate.service";

describe("Service: AdminWorkerRegistrationTokenCreateService", () => {
  let adminWorkerRegistrationTokenCreateService: AdminWorkerRegistrationTokenCreateService;

  beforeEach(context => {
    adminWorkerRegistrationTokenCreateService = context.container.resolve(
      AdminWorkerRegistrationTokenCreateService,
    );
  });

  it("should create a worker registration token with an expiration date", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const expires_at = new Date(Date.now() + 60 * 60 * 1000);

    const response = await adminWorkerRegistrationTokenCreateService.execute({
      data: { expires_at, is_unlimited_usage: false },
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({
      is_unlimited_usage: false,
      user_id: admin.id,
      activated_at: null,
    });
    expect(response.expires_at?.toISOString()).toBe(expires_at.toISOString());
    expect(response.token).toEqual(expect.any(String));
  });

  it("should create a worker registration token without an expiration date", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    const response = await adminWorkerRegistrationTokenCreateService.execute({
      data: { is_unlimited_usage: true },
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({
      expires_at: null,
      is_unlimited_usage: true,
      user_id: admin.id,
      activated_at: null,
    });
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerRegistrationTokenCreateService.execute({
        data: { is_unlimited_usage: false },
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
