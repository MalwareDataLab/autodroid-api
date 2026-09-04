import { describe, expect, it } from "vitest";

describe("E2E: AuthenticationMiddleware", () => {
  it("should authenticate a request with a valid session token", async context => {
    const response = await context
      .userAuthorized(context.request.get("/dataset"))
      .send();

    expect(response.status).toBe(200);
  });

  it("should not authenticate a request with an invalid token", async context => {
    const response = await context
      .userAuthorized(context.request.get("/dataset"))
      .set("Authorization", `Bearer someToken`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should skip authentication when the authorization header has no token", async context => {
    const response = await context.request
      .get("/health")
      .set("Authorization", "Bearer")
      .send();

    expect(response.status).toBe(200);
  });

  it("should skip authentication when no authorization header is present", async context => {
    const response = await context.request.get("/health").send();

    expect(response.status).toBe(200);
  });
});
