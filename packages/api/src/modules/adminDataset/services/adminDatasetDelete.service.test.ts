import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Repository import
import { IFileRepository } from "@shared/container/repositories";
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Service import
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
    // Dataset.file_id is a unique FK with onDelete: Cascade, so a real,
    // consistent DB state can never have a dataset pointing at a missing
    // file — deleting the file cascades to delete the dataset too. Simulate
    // the race (file removed between the two lookups) via a single-call spy
    // on the real repository, matching this codebase's existing convention
    // for found-then-vanished races (see userDatasetRequestPublication.service.test.ts).
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
