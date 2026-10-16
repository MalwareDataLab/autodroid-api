import { faker } from "@faker-js/faker";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";
import { IFileRepository } from "@shared/container/repositories";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Target import
import { AdminDatasetDeleteService } from "./adminDatasetDelete.service";

describe("Service: AdminDatasetDeleteService", () => {
  let adminUser: User;
  let datasetRepository: IDatasetRepository;
  let fileRepository: IFileRepository;
  let adminDatasetDeleteService: AdminDatasetDeleteService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    datasetRepository = container.resolve("DatasetRepository");
    fileRepository = container.resolve("FileRepository");
    adminDatasetDeleteService = container.resolve(AdminDatasetDeleteService);
  });

  it("should delete a dataset and remove its file from storage", async () => {
    const owner = await userFactory.create();
    const file = await fileFactory.create();
    const dataset = await datasetFactory.create({
      user_id: owner.id,
      file_id: file.id,
    });

    const response = await adminDatasetDeleteService.execute({
      dataset_id: dataset.id,
      user: adminUser,
      language: "en",
    });

    expect(response).toMatchObject({ id: dataset.id });
    await expect(
      datasetRepository.findOne({ id: dataset.id }),
    ).resolves.toBeNull();
  });

  it("should throw if the dataset was not found", async () => {
    await expect(() =>
      adminDatasetDeleteService.execute({
        dataset_id: faker.string.uuid(),
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_delete_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the file was not found", async () => {
    const owner = await userFactory.create();
    const file = await fileFactory.create();
    const dataset = await datasetFactory.create({
      user_id: owner.id,
      file_id: file.id,
    });
    vi.spyOn(fileRepository, "findOne").mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetDeleteService.execute({
        dataset_id: dataset.id,
        user: adminUser,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_delete_service/FILE_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminDatasetDeleteService.execute({
        dataset_id: faker.string.uuid(),
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
