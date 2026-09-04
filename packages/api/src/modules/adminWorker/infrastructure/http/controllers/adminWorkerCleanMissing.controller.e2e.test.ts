import { describe, expect, it } from "vitest";

describe("E2E: AdminWorkerCleanMissingController", () => {
  it("should clean missing workers for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.delete("/admin/worker/clean-missing"))
      .send();

    expect(response.status).toBe(200);
  });

  it("should fail cleaning missing workers for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.delete("/admin/worker/clean-missing"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });
});
