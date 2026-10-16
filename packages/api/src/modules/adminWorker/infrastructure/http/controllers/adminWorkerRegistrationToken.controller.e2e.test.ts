import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Constant import
import { TAKE_DEFAULT } from "@modules/pagination/constants/paginationLimit.constant";

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

  it("should list registration tokens for an admin without their secret values", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(context.request.get("/admin/worker/registration-token"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toHaveLength(1);
    expect(response.body.edges[0].node).toMatchObject({
      id: token.id,
      token: null,
    });
  });

  it("should return the first default-sized page when no pagination is requested", async context => {
    await workerRegistrationTokenFactory.createList(TAKE_DEFAULT + 1);

    const response = await context
      .adminAuthorized(context.request.get("/admin/worker/registration-token"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toHaveLength(TAKE_DEFAULT);
    expect(response.body.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(response.body.totalCount).toBe(TAKE_DEFAULT + 1);
  });

  it.for([
    {
      filterName: "is_unlimited_usage=true",
      matchingToken: { is_unlimited_usage: true },
      otherToken: { is_unlimited_usage: false },
      query: { is_unlimited_usage: "true" },
    },
    {
      filterName: "activated=true",
      matchingToken: { activated_at: new Date() },
      otherToken: { activated_at: null },
      query: { activated: "true" },
    },
    {
      filterName: "activatable=true",
      matchingToken: { expires_at: faker.date.future() },
      otherToken: {
        expires_at: faker.date.future(),
        archived_at: new Date(),
      },
      query: { activatable: "true" },
    },
    {
      filterName: "expired=true",
      matchingToken: { expires_at: faker.date.past() },
      otherToken: { expires_at: faker.date.future() },
      query: { expired: "true" },
    },
    {
      filterName: "archived=true",
      matchingToken: { archived_at: new Date() },
      otherToken: { archived_at: null },
      query: { archived: "true" },
    },
  ])(
    "should list only the registration tokens matching the $filterName filter",
    async ({ matchingToken, otherToken, query }, context) => {
      const expectedToken =
        await workerRegistrationTokenFactory.create(matchingToken);
      await workerRegistrationTokenFactory.create(otherToken);

      const response = await context
        .adminAuthorized(
          context.request.get("/admin/worker/registration-token").query(query),
        )
        .send();

      expect(response.status).toBe(200);
      expect(
        response.body.edges.map(
          (edge: { node: { id: string } }) => edge.node.id,
        ),
      ).toEqual([expectedToken.id]);
      expect(response.body.totalCount).toBe(1);
    },
  );

  it("should list only the registration token matching the token filter", async context => {
    const expectedToken = await workerRegistrationTokenFactory.create();
    await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(
        context.request
          .get("/admin/worker/registration-token")
          .query({ token: expectedToken.token }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(
      response.body.edges.map((edge: { node: { id: string } }) => edge.node.id),
    ).toEqual([expectedToken.id]);
    expect(response.body.totalCount).toBe(1);
  });

  it("should list only the registration tokens of the user_id filter", async context => {
    const expectedToken = await workerRegistrationTokenFactory.create();
    await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(
        context.request
          .get("/admin/worker/registration-token")
          .query({ user_id: expectedToken.user_id }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(
      response.body.edges.map((edge: { node: { id: string } }) => edge.node.id),
    ).toEqual([expectedToken.id]);
    expect(response.body.totalCount).toBe(1);
  });

  it("should show a registration token for an admin", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.get(`/admin/worker/registration-token/${token.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: token.id, token: token.token });
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

  it("should delete a registration token for an admin without returning its secret value", async context => {
    const token = await workerRegistrationTokenFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/worker/registration-token/${token.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: token.id, token: null });
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
