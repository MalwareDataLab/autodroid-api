import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { gql } from "@/test/utils/gql.util";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

describe("E2E: AdminWorkerResolver", () => {
  it("should list workers for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorkers {
            adminWorkers {
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
    expect(response.body.data.adminWorkers.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: worker.id }),
        }),
      ]),
    );
  });

  it("should forbid listing workers for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorkers {
            adminWorkers {
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

  it("should show a worker for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorker($worker_id: String!) {
            adminWorker(worker_id: $worker_id) {
              id
            }
          }
        `,
        variables: { worker_id: worker.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminWorker).toMatchObject({ id: worker.id });
  });

  it("should fail showing a worker that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query AdminWorker($worker_id: String!) {
            adminWorker(worker_id: $worker_id) {
              id
            }
          }
        `,
        variables: { worker_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: { code: "@admin_worker_show_service/WORKER_NOT_FOUND" },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should update a worker for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerUpdate(
            $worker_id: String!
            $data: AdminWorkerUpdateSchema!
          ) {
            adminWorkerUpdate(worker_id: $worker_id, data: $data) {
              id
              description
              tags
            }
          }
        `,
        variables: {
          worker_id: worker.id,
          data: { description: "Updated", tags: "a,b,c" },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminWorkerUpdate).toMatchObject({
      id: worker.id,
      description: "Updated",
      tags: "a,b,c",
    });
  });

  it("should fail updating a worker with invalid tags", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerUpdate(
            $worker_id: String!
            $data: AdminWorkerUpdateSchema!
          ) {
            adminWorkerUpdate(worker_id: $worker_id, data: $data) {
              id
            }
          }
        `,
        variables: {
          worker_id: worker.id,
          data: { tags: "a,b," },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_worker_update_service/TAGS_NOT_PROVIDED",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should fail updating a worker that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerUpdate(
            $worker_id: String!
            $data: AdminWorkerUpdateSchema!
          ) {
            adminWorkerUpdate(worker_id: $worker_id, data: $data) {
              id
            }
          }
        `,
        variables: {
          worker_id: faker.string.uuid(),
          data: { description: "Updated" },
        },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_worker_update_service/WORKER_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should delete a worker for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerDelete($worker_id: String!) {
            adminWorkerDelete(worker_id: $worker_id) {
              id
            }
          }
        `,
        variables: { worker_id: worker.id },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.adminWorkerDelete).toMatchObject({
      id: worker.id,
    });
  });

  it("should fail deleting a worker that was not found", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerDelete($worker_id: String!) {
            adminWorkerDelete(worker_id: $worker_id) {
              id
            }
          }
        `,
        variables: { worker_id: faker.string.uuid() },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@admin_worker_delete_service/WORKER_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should clean missing workers for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          mutation AdminWorkerCleanMissing {
            adminWorkerCleanMissing
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(typeof response.body.data.adminWorkerCleanMissing).toBe("number");
  });
});
