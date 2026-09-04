import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

describe("E2E: AdminDatasetVisibilityController", () => {
  it("should update a dataset visibility for an admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .adminAuthorized(
        context.request.patch(`/admin/dataset/${dataset.id}/update-visibility`),
      )
      .send({ visibility: DATASET_VISIBILITY.PUBLIC });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
  });

  it("should fail updating visibility of a dataset that was not found", async context => {
    const response = await context
      .adminAuthorized(
        context.request.patch(
          `/admin/dataset/${faker.string.uuid()}/update-visibility`,
        ),
      )
      .send({ visibility: DATASET_VISIBILITY.PUBLIC });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@admin_dataset_update_visibility_service/DATASET_NOT_FOUND",
    });
  });

  it("should fail updating visibility for a non-admin", async context => {
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await context
      .userAuthorized(
        context.request.patch(`/admin/dataset/${dataset.id}/update-visibility`),
      )
      .send({ visibility: DATASET_VISIBILITY.PUBLIC });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@admin_auth_middleware/NOT_AN_ADMIN",
    });
  });
});
