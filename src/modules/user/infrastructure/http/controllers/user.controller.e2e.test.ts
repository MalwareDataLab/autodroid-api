import { describe, expect, it } from "vitest";
import request from "supertest";

describe("E2E: UserController", () => {
  it("should return user data", async context => {
    const response = await request(context.app.httpServer)
      .get("/user")
      .set("Authorization", `Bearer ${context.session.idToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: context.session.displayName || null,
      email: context.session.email,
    });
  });

  it("should be able to update user data", async context => {
    const data = {
      name: "Updated",
      language: "pt-BR",
    };

    const response = await request(context.app.httpServer)
      .put("/user")
      .set("Authorization", `Bearer ${context.session.idToken}`)
      .send(data);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(data);
  });

  it("should return an error if the language is invalid", async context => {
    const data = {
      name: "Updated",
      language: "wrong",
    };

    const response = await request(context.app.httpServer)
      .put("/user")
      .set("Authorization", `Bearer ${context.session.idToken}`)
      .send(data);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@user_update_data_service/INVALID_LANGUAGE",
    });
  });
});
