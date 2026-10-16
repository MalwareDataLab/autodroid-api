import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Enum import
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Factory import
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const futureDate = () =>
  new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

describe("E2E: AdminProcessingController", () => {
  it("should fail listing processes for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.get("/admin/processing"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });

  it("should fail listing processes when unauthenticated", async context => {
    const response = await context.request.get("/admin/processing").send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should list only the requested page of the processes, in the requested order", async context => {
    const processesOldestFirst = await Promise.all(
      [1, 2, 3].map(day =>
        processingFactory.create({
          created_at: new Date(Date.UTC(2024, 0, day)),
        }),
      ),
    );

    const response = await context
      .adminAuthorized(
        context.request.get("/admin/processing").query({
          skip: 1,
          take: 1,
          sort: JSON.stringify([{ field: "created_at", order: "asc" }]),
        }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(3);
    expect(response.body.edges).toHaveLength(1);
    expect(response.body.edges[0].node.id).toBe(processesOldestFirst[1].id);
    expect(response.body.pageInfo).toMatchObject({
      hasPreviousPage: true,
      hasNextPage: true,
    });
  });

  it("should read a boolean filter from the query string when listing processes", async context => {
    await processingFactory.create({
      started_at: new Date(Date.UTC(2024, 0, 5)),
    });
    const notStartedProcessing = await processingFactory.create({
      started_at: null,
    });

    const response = await context
      .adminAuthorized(
        context.request.get("/admin/processing").query({ started: "false" }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(1);
    expect(
      response.body.edges.map((edge: { node: { id: string } }) => edge.node.id),
    ).toEqual([notStartedProcessing.id]);
  });

  it("should fail showing a processing that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.get(`/admin/processing/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processing_show_service/PROCESSING_NOT_FOUND",
    });
  });

  it("should fail updating a processing that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.put(`/admin/processing/${faker.string.uuid()}`),
      )
      .send({ keep_until: futureDate() });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processing_update_service/PROCESSING_NOT_FOUND",
    });
  });

  it("should fail deleting a processing that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/processing/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_processing_delete_service/PROCESSING_NOT_FOUND",
    });
  });

  it("should list processes for an admin", async context => {
    const processing = await processingFactory.create();

    const response = await context
      .adminAuthorized(context.request.get("/admin/processing"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: processing.id }),
        }),
      ]),
    );
  });

  it("should show a processing for an admin", async context => {
    const processing = await processingFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.get(`/admin/processing/${processing.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processing.id });
  });

  it("should update a processing for an admin", async context => {
    const processing = await processingFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.put(`/admin/processing/${processing.id}`),
      )
      .send({
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        keep_until: futureDate(),
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });
  });

  it("should delete a processing that has no stored files for an admin", async context => {
    const processing = await processingFactory.create();
    await context.repositories.ProcessingRepository.updateOne(
      { id: processing.id },
      { result_file_id: null, metrics_file_id: null },
    );

    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/processing/${processing.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processing.id });
    await expect(
      context.repositories.ProcessingRepository.findOne({ id: processing.id }),
    ).resolves.toBeNull();
  });
});
