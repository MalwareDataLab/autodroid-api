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
      name: context.userSession.displayName,
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
});
