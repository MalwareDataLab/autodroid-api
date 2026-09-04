import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

describe("E2E: AdminWorkerController", () => {
  it("should list workers for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.get("/admin/worker"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: worker.id }),
        }),
      ]),
    );
  });

  it("should fail listing workers for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.get("/admin/worker"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });

  it("should fail listing workers when unauthenticated", async context => {
    const response = await context.request.get("/admin/worker").send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should show a worker for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.get(`/admin/worker/${worker.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: worker.id });
  });

  it("should fail showing a worker that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.get(`/admin/worker/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_worker_show_service/WORKER_NOT_FOUND",
    });
  });

  it("should update a worker for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.put(`/admin/worker/${worker.id}`))
      .send({ description: "Updated", tags: "a,b" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: worker.id,
      description: "Updated",
      tags: "a,b",
    });
  });

  it("should fail updating a worker that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.put(`/admin/worker/${faker.string.uuid()}`),
      )
      .send({ description: "Updated" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_worker_update_service/WORKER_NOT_FOUND",
    });
  });

  it("should delete a worker for an admin", async context => {
    const worker = await workerFactory.create();

    const response = await context
      .adminAuthorized(context.request.delete(`/admin/worker/${worker.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: worker.id });
  });

  it("should fail deleting a worker that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/worker/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_worker_delete_service/WORKER_NOT_FOUND",
    });
  });
});
