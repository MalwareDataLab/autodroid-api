import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Service import
import { AdminDatasetShowService } from "./adminDatasetShow.service";

describe("Service: AdminDatasetShowService", () => {
  let adminUser: User;
  let adminDatasetShowService: AdminDatasetShowService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminDatasetShowService = container.resolve(AdminDatasetShowService);
  });

  it("should show a dataset", async () => {
    const owner = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: owner.id });

    const response = await adminDatasetShowService.execute({
      dataset_id: dataset.id,
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject(dataset);
  });

  it("should throw if the dataset was not found", async () => {
    await expect(() =>
      adminDatasetShowService.execute({
        dataset_id: faker.string.uuid(),
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_show_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: nonAdmin.id });

    expect(() =>
      adminDatasetShowService.execute({
        dataset_id: dataset.id,
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
