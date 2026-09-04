import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Schema import
import { AdminDatasetUpdateSchema } from "../schemas/adminDataset.schema";

// Service import
import { AdminDatasetUpdateService } from "./adminDatasetUpdate.service";

describe("Service: AdminDatasetUpdateService", () => {
  let adminUser: User;
  let adminDatasetUpdateService: AdminDatasetUpdateService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminDatasetUpdateService = container.resolve(AdminDatasetUpdateService);
  });

  it("should update a dataset with description and tags", async () => {
    const owner = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: owner.id });
    const data: AdminDatasetUpdateSchema = {
      description: "  Updated description  ",
      tags: " one , two , three ",
    };

    const response = await adminDatasetUpdateService.execute({
      dataset_id: dataset.id,
      data,
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject({
      id: dataset.id,
      description: "Updated description",
      tags: "one,two,three",
    });
  });

  it("should update a dataset with null description and tags", async () => {
    const owner = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: owner.id });

    const response = await adminDatasetUpdateService.execute({
      dataset_id: dataset.id,
      data: { description: null, tags: null },
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject({
      id: dataset.id,
      description: null,
      tags: null,
    });
  });

  it("should throw if the dataset was not found", async () => {
    await expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: faker.string.uuid(),
        data: { description: null, tags: null },
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_update_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the description is invalid", async () => {
    const owner = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: owner.id });

    await expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data: {
          description: 123 as unknown as string,
          tags: null,
        },
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_create_service/INVALID_DESCRIPTION",
      }),
    );
  });

  it("should throw if the tags are invalid", async () => {
    const owner = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: owner.id });

    await expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data: {
          description: "Updated description",
          tags: "one,two,three,",
        },
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_create_service/TAGS_NOT_PROVIDED",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminDatasetUpdateService.execute({
        dataset_id: faker.string.uuid(),
        data: { description: null, tags: null },
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
