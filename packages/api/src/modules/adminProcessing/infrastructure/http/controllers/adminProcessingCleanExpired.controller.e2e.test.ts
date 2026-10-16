import { describe, expect, it } from "vitest";

describe("E2E: AdminProcessingCleanExpiredController", () => {
  it("should clean expired processes for an admin", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete("/admin/processing/clean-expired"),
      )
      .send();

    expect(response.status).toBe(200);
  });

  it("should fail cleaning expired processes for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.delete("/admin/processing/clean-expired"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });
});
