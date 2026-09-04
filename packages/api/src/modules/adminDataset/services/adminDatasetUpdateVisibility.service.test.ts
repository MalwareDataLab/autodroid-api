import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Service import
import { AdminDatasetUpdateVisibilityService } from "./adminDatasetUpdateVisibility.service";

describe("Service: AdminDatasetUpdateVisibilityService", () => {
  let adminUser: User;
  let adminDatasetUpdateVisibilityService: AdminDatasetUpdateVisibilityService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminDatasetUpdateVisibilityService = container.resolve(
      AdminDatasetUpdateVisibilityService,
    );
  });

  it("should update the dataset visibility", async () => {
    const owner = await userFactory.create();
    const dataset = await datasetFactory.create({
      user_id: owner.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    const response = await adminDatasetUpdateVisibilityService.execute({
      dataset_id: dataset.id,
      data: { visibility: DATASET_VISIBILITY.PUBLIC },
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject({
      id: dataset.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
  });

  it("should throw if the dataset was not found", async () => {
    await expect(() =>
      adminDatasetUpdateVisibilityService.execute({
        dataset_id: faker.string.uuid(),
        data: { visibility: DATASET_VISIBILITY.PUBLIC },
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_update_visibility_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminDatasetUpdateVisibilityService.execute({
        dataset_id: faker.string.uuid(),
        data: { visibility: DATASET_VISIBILITY.PUBLIC },
        user: nonAdmin,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
