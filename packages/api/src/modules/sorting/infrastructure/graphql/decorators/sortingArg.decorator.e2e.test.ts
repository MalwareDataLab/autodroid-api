import { gql } from "@/test/utils/gql.util";
import { describe, expect, it } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("E2E: SortingArg decorator", () => {
  it("should accept a valid sorting argument", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDatasets($sorting: [SortingFieldSchema!]) {
            userDatasets(sorting: $sorting) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
        variables: {
          sorting: [{ field: "created_at", order: "ASC" }],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userDatasets.edges).toEqual(expect.any(Array));
  });

  it("should return a validation error for an invalid sorting field", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserDatasets($sorting: [SortingFieldSchema!]) {
            userDatasets(sorting: $sorting) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
        variables: {
          sorting: [{ field: "not_a_field", order: "ASC" }],
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: expect.objectContaining({
            code: "GRAPHQL_VALIDATION_FAILED",
          }),
        }),
      ]),
    );
  });
});
