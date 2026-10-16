import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

// Util import
import {
  generateStorageEmulatorPath,
  getStorageEmulatorObjectStatus,
  putStorageEmulatorObject,
} from "@/test/utils/storageEmulator.util";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

describe("E2E: AdminDatasetController", () => {
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

  it("should list only the requested page of the filtered datasets, in the requested order", async context => {
    const privateDatasetsOldestFirst = await Promise.all(
      [1, 2, 3].map(day =>
        datasetFactory.create({
          visibility: DATASET_VISIBILITY.PRIVATE,
          created_at: new Date(Date.UTC(2024, 0, day)),
        }),
      ),
    );
    await datasetFactory.create({ visibility: DATASET_VISIBILITY.PUBLIC });

    const response = await context
      .adminAuthorized(
        context.request.get("/admin/dataset").query({
          visibility: DATASET_VISIBILITY.PRIVATE,
          skip: 1,
          take: 1,
          sort: JSON.stringify([{ field: "created_at", order: "asc" }]),
        }),
      )
      .send();

    expect(response.status).toBe(200);
    expect(response.body.totalCount).toBe(3);
    expect(response.body.edges).toHaveLength(1);
    expect(response.body.edges[0].node.id).toBe(
      privateDatasetsOldestFirst[1].id,
    );
    expect(response.body.pageInfo).toMatchObject({
      hasPreviousPage: true,
      hasNextPage: true,
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

  it("should delete a dataset and its stored object for an admin", async context => {
    const file = await fileFactory.create({
      provider_path: generateStorageEmulatorPath("datasets"),
    });
    await putStorageEmulatorObject(file.provider_path);
    const dataset = await datasetFactory.create({
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });

    const response = await context
      .adminAuthorized(context.request.delete(`/admin/dataset/${dataset.id}`))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: dataset.id });
    await expect(
      context.repositories.DatasetRepository.findOne({ id: dataset.id }),
    ).resolves.toBeNull();
    await expect(
      getStorageEmulatorObjectStatus(file.provider_path),
    ).resolves.toBe(404);
  });
});
