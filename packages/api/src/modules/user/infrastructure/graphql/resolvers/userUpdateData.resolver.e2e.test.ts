import { describe, expect, it } from "vitest";

// Util import
import { createDisposableFirebaseSession } from "@/test/utils/createDisposableFirebaseSession.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: UserUpdateDataResolver", () => {
  it("should be able to update user data", async context => {
    const currentResponse = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: `query { user { name } }` });
    const data = {
      name: currentResponse.body.data.user.name,
      language: "pt-BR",
    };

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: `mutation UserUpdateData($data: UserUpdateDataSchema!) {
          userUpdateData(data: $data) {
            name
            email
            language
          }
        }`,
        variables: {
          data,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userUpdateData).toMatchObject({
      name: data.name,
      language: data.language,
      email: context.userSession.email,
    });
  });

  it("should return an error if the language is invalid", async context => {
    const data = {
      name: "Updated",
      language: "wrong",
    };

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: `mutation UserUpdateData($data: UserUpdateDataSchema!) {
        userUpdateData(data: $data) {
          name
          email
          language
        }
      }`,
        variables: {
          data,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Invalid language.",
          extensions: {
            code: "@user_update_data_service/INVALID_LANGUAGE",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should carry the class-validator constraint messages in the error extensions when the input is invalid", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: `mutation UserUpdateData($data: UserUpdateDataSchema!) {
          userUpdateData(data: $data) {
            id
          }
        }`,
        variables: {
          data: { name: "Updated", phone_number: "12" },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0]).toMatchObject({
      message: "Argument Validation Error",
      extensions: {
        code: "GRAPHQL_VALIDATION_FAILED",
        validationErrors: [
          {
            property: "phone_number",
            constraints: {
              isPhoneNumber: "phone_number must be a valid phone number",
            },
          },
        ],
      },
    });
  });

  it("should be able to update user learning data", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: `mutation UserUpdateLearningData($data: JSON!) {
          userUpdateLearningData(data: $data) {
            id
            learning_data
          }
        }`,
        variables: {
          data: { onboarding: true, step: 2 },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(
      response.body.data.userUpdateLearningData.learning_data,
    ).toMatchObject({
      onboarding: true,
      step: 2,
    });
  });

  it("should return an error updating learning data when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: `mutation UserUpdateLearningData($data: JSON!) {
          userUpdateLearningData(data: $data) {
            id
          }
        }`,
        variables: {
          data: { onboarding: true },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "UNAUTHORIZED",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
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
        .post("/graphql")
        .set("Authorization", `Bearer ${disposable.session.idToken}`)
        .send({
          query: `mutation UserUpdateData($data: UserUpdateDataSchema!) {
            userUpdateData(data: $data) {
              id
              name
              language
            }
          }`,
          variables: { data },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.userUpdateData).toEqual({
        id: user.id,
        ...data,
      });
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
