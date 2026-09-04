import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { gql } from "@/test/utils/gql.util";

// Factory import
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

describe("E2E: AdminWorkerRegistrationTokenResolver", () => {
  it("should list registration tokens for an admin", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorkerRegistrationTokens {
            adminWorkerRegistrationTokens {
              edges {
                node {
                  id
                }
              }
              totalCount
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminWorkerRegistrationTokens.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: token.id }),
        }),
      ]),
    );
  });

  it("should forbid listing registration tokens for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorkerRegistrationTokens {
            adminWorkerRegistrationTokens {
              totalCount
            }
          }
        `,
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ extensions: { code: "FORBIDDEN" } }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should show a registration token for an admin", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorkerRegistrationToken(
            $worker_registration_token_id: String!
          ) {
            adminWorkerRegistrationToken(
              worker_registration_token_id: $worker_registration_token_id
            ) {
              id
              token
            }
          }
        `,
        variables: { worker_registration_token_id: token.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminWorkerRegistrationToken).toMatchObject({
      id: token.id,
    });
  });

  it("should fail showing a registration token that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorkerRegistrationToken(
            $worker_registration_token_id: String!
          ) {
            adminWorkerRegistrationToken(
              worker_registration_token_id: $worker_registration_token_id
            ) {
              id
            }
          }
        `,
        variables: { worker_registration_token_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_worker_registration_token_show_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should create a registration token for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerRegistrationTokenCreate(
            $data: WorkerRegistrationTokenCreateSchema!
          ) {
            adminWorkerRegistrationTokenCreate(data: $data) {
              id
              is_unlimited_usage
              token
            }
          }
        `,
        variables: {
          data: { is_unlimited_usage: true },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminWorkerRegistrationTokenCreate).toMatchObject(
      { is_unlimited_usage: true },
    );
    expect(
      response.body.data.adminWorkerRegistrationTokenCreate.token,
    ).toBeTruthy();
  });

  it("should delete a registration token for an admin", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerRegistrationTokenDelete(
            $worker_registration_token_id: String!
          ) {
            adminWorkerRegistrationTokenDelete(
              worker_registration_token_id: $worker_registration_token_id
            ) {
              id
            }
          }
        `,
        variables: { worker_registration_token_id: token.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminWorkerRegistrationTokenDelete).toMatchObject(
      { id: token.id },
    );
  });

  it("should fail deleting a registration token that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerRegistrationTokenDelete(
            $worker_registration_token_id: String!
          ) {
            adminWorkerRegistrationTokenDelete(
              worker_registration_token_id: $worker_registration_token_id
            ) {
              id
            }
          }
        `,
        variables: { worker_registration_token_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_worker_registration_token_delete_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });
});
