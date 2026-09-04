import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IFileRepository } from "@modules/file/repositories/IFile.repository";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { datasetFactory } from "../entities/factories/dataset.factory";

// Service import
import { UserDatasetDeleteService } from "./userDatasetDelete.service";

describe("Service: UserDatasetDeleteService", () => {
  let storageProviderMock: Mocked<IStorageProvider>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let fileRepositoryMock: Mocked<IFileRepository>;

  let userDatasetDeleteService: UserDatasetDeleteService;

  beforeEach(() => {
    storageProviderMock = {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    };

    datasetRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    fileRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    userDatasetDeleteService = new UserDatasetDeleteService(
      storageProviderMock,
      datasetRepositoryMock,
      fileRepositoryMock,
    );
  });

  it("should delete a private dataset owned by the user", async () => {
    const user = userFactory.build();
    const file = fileFactory.build();
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
      file,
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    fileRepositoryMock.findOne.mockResolvedValueOnce(file);
    datasetRepositoryMock.deleteOne.mockResolvedValueOnce(dataset);
    storageProviderMock.removeFileByPath.mockResolvedValueOnce(
      file.provider_path,
    );

    const response = await userDatasetDeleteService.execute({
      dataset_id: dataset.id,
      user,
      language: "en",
    });

    expect(response).toBe(dataset);
    expect(datasetRepositoryMock.deleteOne).toHaveBeenCalledWith({
      id: dataset.id,
    });
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledWith({
      path: file.provider_path,
      language: "en",
    });
  });

  it("should throw if the dataset is not private", async () => {
    const user = userFactory.build();
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
      user_id: user.id,
      file: fileFactory.build(),
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

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
    const user = userFactory.build();
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
      file: fileFactory.build(),
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    fileRepositoryMock.findOne.mockResolvedValueOnce(null);

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
    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      userDatasetDeleteService.execute({
        dataset_id: faker.string.uuid(),
        user: userFactory.build(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@dataset_guard/DATASET_NOT_FOUND" }),
    );
  });
});
