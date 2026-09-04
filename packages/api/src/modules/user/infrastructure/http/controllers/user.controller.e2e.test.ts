import { describe, expect, it } from "vitest";

describe("E2E: UserController", () => {
  it("should return user data", async context => {
    const response = await context
      .userAuthorized(context.request.get("/user"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: context.userSession.displayName || null,
      email: context.userSession.email,
    });
  });

  it("should be able to update user data", async context => {
    const data = {
      name: "Updated",
      language: "pt-BR",
    };

    const response = await context
      .userAuthorized(context.request.put("/user"))
      .send(data);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(data);
  });

  it("should return an error if the language is invalid", async context => {
    const data = {
      name: "Updated",
      language: "wrong",
    };

    const response = await context
      .userAuthorized(context.request.put("/user"))
      .send(data);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@user_update_data_service/INVALID_LANGUAGE",
    });
  });
});
