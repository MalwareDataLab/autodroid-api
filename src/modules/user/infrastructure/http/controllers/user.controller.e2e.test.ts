import { describe, expect, it } from "vitest";
import request from "supertest";

describe("E2E: UserController", () => {
  it("should return user data", async () => {
    const response = await request(global.TestInjection.app.httpServer)
      .get("/user")
      .set("Authorization", `Bearer ${global.TestInjection.session.idToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: global.TestInjection.session.displayName,
      email: global.TestInjection.session.email,
    });
  });

  it("should be able to update user data", async () => {
    const data = {
      name: "Updated",
      language: "pt-BR",
    };

    const response = await request(global.TestInjection.app.httpServer)
      .put("/user")
      .set("Authorization", `Bearer ${global.TestInjection.session.idToken}`)
      .send(data);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(data);
  });

  it("should return an error if the language is invalid", async () => {
    const data = {
      name: "Updated",
      language: "wrong",
    };

    const response = await request(global.TestInjection.app.httpServer)
      .put("/user")
      .set("Authorization", `Bearer ${global.TestInjection.session.idToken}`)
      .send(data);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@user_update_data_service/INVALID_LANGUAGE",
    });
  });
});
