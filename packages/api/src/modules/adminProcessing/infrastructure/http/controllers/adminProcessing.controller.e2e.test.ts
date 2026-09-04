import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

const futureDate = () =>
  new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

describe("E2E: AdminProcessingController", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
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

  it("should delete a processing for an admin", async context => {
    const processing = await processingFactory.create();

    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/processing/${processing.id}`),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: processing.id });
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
});
