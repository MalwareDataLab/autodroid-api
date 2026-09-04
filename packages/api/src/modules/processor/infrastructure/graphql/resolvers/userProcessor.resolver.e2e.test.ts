import { gql } from "@/test/utils/gql.util";
import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

describe("E2E: UserProcessorResolver", () => {
  it("should list user processors", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const processor = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessors {
            userProcessors {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessors.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processor.id }),
        }),
      ]),
    );
  });

  it("should return an error listing processors when unauthorized", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .set("Authorization", `Bearer someToken`)
      .send({
        query: gql`
          query UserProcessors {
            userProcessors {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should show a user processor", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const processor = await processorFactory.create({
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessor($processor_id: String!) {
            userProcessor(processor_id: $processor_id) {
              id
              visibility
            }
          }
        `,
        variables: { processor_id: processor.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.userProcessor).toMatchObject({
      id: processor.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
  });

  it("should return an error showing a processor that was not found", async context => {
    await userFactory.create({ email: context.userSession.email });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessor($processor_id: String!) {
            userProcessor(processor_id: $processor_id) {
              id
            }
          }
        `,
        variables: { processor_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@processor_guard/PROCESSOR_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should return an error showing a hidden processor owned by another user", async context => {
    await userFactory.create({ email: context.userSession.email });
    const otherUser = await userFactory.create();
    const processor = await processorFactory.create({
      user_id: otherUser.id,
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
    });

    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query UserProcessor($processor_id: String!) {
            userProcessor(processor_id: $processor_id) {
              id
            }
          }
        `,
        variables: { processor_id: processor.id },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@processor_guard/PROCESSOR_NOT_PUBLIC" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});
