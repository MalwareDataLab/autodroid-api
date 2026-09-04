import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IFileRepository } from "@modules/file/repositories/IFile.repository";

// Enum import
import { FILE_TYPE } from "@modules/file/types/fileType.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

// Service import
import { UserDatasetDeleteService } from "./userDatasetDelete.service";

describe("Service: UserDatasetDeleteService", () => {
  let storageProvider: IStorageProvider;
  let datasetRepository: IDatasetRepository;
  let fileRepository: IFileRepository;

  let userDatasetDeleteService: UserDatasetDeleteService;

  beforeEach(() => {
    storageProvider = container.resolve("StorageProvider");
    datasetRepository = container.resolve("DatasetRepository");
    fileRepository = container.resolve("FileRepository");

    userDatasetDeleteService = new UserDatasetDeleteService(
      storageProvider,
      datasetRepository,
      fileRepository,
    );
  });

  it("should delete a private dataset owned by the user", async () => {
    const user = await userFactory.create();
    const file = await fileFactory.create({ type: FILE_TYPE.DATASET });
    const dataset = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    vi.spyOn(storageProvider, "removeFileByPath").mockResolvedValueOnce(
      file.provider_path,
    );

    const response = await userDatasetDeleteService.execute({
      dataset_id: dataset.id,
      user,
      language: "en",
    });

    expect(response.id).toBe(dataset.id);
    expect(storageProvider.removeFileByPath).toHaveBeenCalledWith({
      path: file.provider_path,
      language: "en",
    });

    const found = await datasetRepository.findOne({ id: dataset.id });
    expect(found).toBeNull();
  });

  it("should throw if the dataset is not private", async () => {
    const user = await userFactory.create();
    const file = await fileFactory.create({ type: FILE_TYPE.DATASET });
    const dataset = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
      user_id: user.id,
    });

    await expect(() =>
      userDatasetDeleteService.execute({
        dataset_id: dataset.id,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_delete_service/DATASET_NOT_EDITABLE",
      }),
    );
  });

  it("should throw if the file is not found", async () => {
    // Dataset.file_id is a Prisma relation with onDelete: Cascade, so
    // deleting the file always cascades and deletes the dataset with it —
    // "dataset exists but its file doesn't" cannot be constructed via real
    // deletion. Override the one lookup for this defensive guard instead.
    const user = await userFactory.create();
    const file = await fileFactory.create({ type: FILE_TYPE.DATASET });
    const dataset = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    vi.spyOn(fileRepository, "findOne").mockResolvedValueOnce(null);

    await expect(() =>
      userDatasetDeleteService.execute({
        dataset_id: dataset.id,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_delete_service/FILE_NOT_FOUND",
      }),
    );
  });

  it("should throw if the dataset was not found", async () => {
    const user = await userFactory.create();

    await expect(() =>
      userDatasetDeleteService.execute({
        dataset_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@dataset_guard/DATASET_NOT_FOUND" }),
    );
  });
});
