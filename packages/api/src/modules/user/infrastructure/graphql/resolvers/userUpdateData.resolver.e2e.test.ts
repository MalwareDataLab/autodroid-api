import { describe, expect, it } from "vitest";

describe("E2E: UserUpdateDataResolver", () => {
  it("should be able to update user data", async context => {
    const data = {
      name: "Updated",
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
});
