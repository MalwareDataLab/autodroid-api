import { describe, expect, it } from "vitest";

// Util import
import { createDisposableFirebaseSession } from "@/test/utils/createDisposableFirebaseSession.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

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

  it("should fail returning user data when unauthenticated", async context => {
    const response = await context.request.get("/user").send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should be able to update user data", async context => {
    const currentResponse = await context
      .userAuthorized(context.request.get("/user"))
      .send();
    const data = {
      name: currentResponse.body.name,
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

  it("should update the user's name in the authentication provider and in the user record", async context => {
    const disposable = await createDisposableFirebaseSession(
      context.container,
      "Original",
    );

    try {
      const user = await userFactory.create({
        email: disposable.session.email,
        name: "Original",
        language: "en",
      });
      const data = { name: "Updated", language: "pt-BR" };

      const response = await context.request
        .put("/user")
        .set("Authorization", `Bearer ${disposable.session.idToken}`)
        .send(data);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: user.id, ...data });
      await expect(
        context.repositories.UserRepository.findOne({ id: user.id }),
      ).resolves.toEqual(expect.objectContaining(data));
      await expect(
        disposable.authenticationMethod.getUserByCode(
          disposable.session.localId,
          "en",
        ),
      ).resolves.toMatchObject({ name: data.name });
    } finally {
      await disposable.dispose();
    }
  });
});
