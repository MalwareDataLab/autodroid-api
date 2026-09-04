import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IFileRepository } from "@shared/container/repositories";
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Service import
import { AdminDatasetDeleteService } from "./adminDatasetDelete.service";

describe("Service: AdminDatasetDeleteService", () => {
  let storageProviderMock: Mocked<IStorageProvider>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let fileRepositoryMock: Mocked<IFileRepository>;

  let adminDatasetDeleteService: AdminDatasetDeleteService;

  beforeEach(() => {
    storageProviderMock = {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    } as unknown as Mocked<IStorageProvider>;

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

    adminDatasetDeleteService = new AdminDatasetDeleteService(
      storageProviderMock,
      datasetRepositoryMock,
      fileRepositoryMock,
    );
  });

  it("should delete a dataset", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const file = fileFactory.build();
    const dataset = datasetFactory.build(
      {},
      {
        associations: { file },
        transient: { withRelations: true },
      },
    );

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    fileRepositoryMock.findOne.mockResolvedValueOnce(file);
    datasetRepositoryMock.deleteOne.mockResolvedValueOnce(dataset);
    storageProviderMock.removeFileByPath.mockResolvedValueOnce(
      file.provider_path,
    );

    const response = await adminDatasetDeleteService.execute({
      dataset_id: dataset.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(dataset);
    expect(datasetRepositoryMock.deleteOne).toHaveBeenCalledWith({
      id: dataset.id,
    });
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledWith({
      path: file.provider_path,
      language: "en",
    });
  });

  it("should throw if the dataset was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetDeleteService.execute({
        dataset_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_delete_service/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if the file was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const file = fileFactory.build();
    const dataset = datasetFactory.build(
      {},
      {
        associations: { file },
        transient: { withRelations: true },
      },
    );

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);
    fileRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminDatasetDeleteService.execute({
        dataset_id: dataset.id,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_dataset_delete_service/FILE_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminDatasetDeleteService.execute({
        dataset_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
