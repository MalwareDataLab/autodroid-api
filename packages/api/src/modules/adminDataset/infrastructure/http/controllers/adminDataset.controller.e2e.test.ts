import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

describe("E2E: AdminDatasetController", () => {
  beforeEach(context => {
    context.container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.create(),
      refreshFile: async ({ file }) => file,
      removeFileByPath: async () => "",
    });
  });

  it("should list datasets for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.get("/admin/dataset"))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ id: dataset.id }),
        }),
      ]),
    );
  });

  it("should fail listing datasets for a non-admin", async context => {
    const response = await context
      .userAuthorized(context.request.get("/admin/dataset"))
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });

  it("should fail listing datasets when unauthenticated", async context => {
    const response = await context.request.get("/admin/dataset").send();

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should show a dataset for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.get(`/admin/dataset/${dataset.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });
  });

  it("should fail showing a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.get(`/admin/dataset/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_dataset_show_service/DATASET_NOT_FOUND",
    });
  });

  it("should update a dataset for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.put(`/admin/dataset/${dataset.id}`))
      .send({ description: "Updated", tags: "a,b,c" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dataset.id,
      description: "Updated",
      tags: "a,b,c",
    });
  });

  it("should fail updating a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.put(`/admin/dataset/${faker.string.uuid()}`),
      )
      .send({ description: "Updated" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_dataset_update_service/DATASET_NOT_FOUND",
    });
  });

  it("should delete a dataset for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(context.request.delete(`/admin/dataset/${dataset.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: dataset.id });
  });

  it("should fail deleting a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.delete(`/admin/dataset/${faker.string.uuid()}`),
      )
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_dataset_delete_service/DATASET_NOT_FOUND",
    });
  });
});
