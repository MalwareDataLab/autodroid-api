import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

describe("E2E: AdminWorkerRegistrationTokenController", () => {
  it("should create a registration token for an admin", async context => {
    const response = await context
      .adminAuthorized(context.request.post("/admin/worker/registration-token"))
      .send({ is_unlimited_usage: true });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ is_unlimited_usage: true });
    expect(response.body.token).toBeTruthy();
  });

  it("should fail creating a registration token for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.post("/admin/worker/registration-token"))
      .send({ is_unlimited_usage: true });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });

  it("should list registration tokens for an admin", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(context.request.get("/admin/worker/registration-token"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: token.id }),
        }),
      ]),
    );
  });

  it("should show a registration token for an admin", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.get(`/admin/worker/registration-token/${token.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: token.id });
  });

  it("should fail showing a registration token that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.get(
          `/admin/worker/registration-token/${faker.string.uuid()}`,
        ),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_worker_registration_token_show_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
    });
  });

  it("should delete a registration token for an admin", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/worker/registration-token/${token.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: token.id });
  });

  it("should fail deleting a registration token that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete(
          `/admin/worker/registration-token/${faker.string.uuid()}`,
        ),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_worker_registration_token_delete_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
    });
  });
});
