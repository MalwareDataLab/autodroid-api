import { describe, expect, it } from "vitest";

// Middleware import
import { adminAuthenticationMiddleware } from "./adminAuthentication.middleware";

describe("E2E: AdminAuthenticationMiddleware", () => {
  it("should allow an admin to reach an admin route", async context => {
    const response = await context
      .adminAuthorized(context.request.get("/admin/dataset"))
      .send();

    expect(response.status).toBe(200);
  });

  it("should return an error when the user is not an admin", async context => {
    const response = await context
      .userAuthorized(context.request.get("/admin/dataset"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });

  it("should return an error when the request is not authenticated", async context => {
    const response = await context
      .userAuthorized(context.request.get("/admin/dataset"))
      .set("Authorization", `Bearer someToken`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should throw when there is no user session", async () => {
    await expect(
      adminAuthenticationMiddleware(
        {
          t: (_key: string, fallback: string) => fallback,
          user_session: undefined,
        } as any,
        {} as any,
        (() => undefined) as any,
      ),
    ).rejects.toMatchObject({
      key: "@admin_auth_middleware/NOT_AUTHENTICATED",
    });
  });
});
