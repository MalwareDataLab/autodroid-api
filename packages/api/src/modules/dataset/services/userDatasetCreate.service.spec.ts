import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Schema import

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { UserDatasetCreateSchema } from "../schemas/userDataset.schema";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { datasetFactory } from "../entities/factories/dataset.factory";

// Service import
import { UserDatasetCreateService } from "./userDatasetCreate.service";

describe("Service: UserDatasetCreateService", () => {
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;
  let storageProviderMock: Mocked<IStorageProvider>;

  let userDatasetCreateService: UserDatasetCreateService;

  const buildData = (
    override: Partial<UserDatasetCreateSchema> = {},
  ): UserDatasetCreateSchema =>
    ({
      filename: faker.system.fileName(),
      mime_type: MIME_TYPE.CSV,
      size: faker.number.int({ min: 1, max: 1000 }),
      md5_hash: faker.string.hexadecimal({ length: 32, prefix: "" }),
      description: faker.word.words(3),
      tags: "one,two,three",
      ...override,
    }) as UserDatasetCreateSchema;

  beforeEach(() => {
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

    processorRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getAllowedMimeTypes: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    storageProviderMock = {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    };

    userDatasetCreateService = new UserDatasetCreateService(
      datasetRepositoryMock,
      processorRepositoryMock,
      storageProviderMock,
    );
  });

  it("should create a dataset with description and tags", async () => {
    const user = userFactory.build();
    const file = fileFactory.build();
    const dataset = datasetFactory.build();

    processorRepositoryMock.getAllowedMimeTypes.mockResolvedValueOnce([
      "text/csv",
    ]);
    storageProviderMock.generateUploadSignedUrl.mockResolvedValueOnce(file);
    datasetRepositoryMock.createOne.mockResolvedValueOnce(dataset);

    const response = await userDatasetCreateService.execute({
      data: buildData({ description: "  hello  ", tags: "a, b ,c" }),
      user,
      language: "en",
    });

    expect(response).toBe(dataset);
    expect(datasetRepositoryMock.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: user.id,
        file_id: file.id,
        description: "hello",
        tags: "a,b,c",
      }),
    );
  });

  it("should create a dataset without description and tags", async () => {
    const user = userFactory.build();
    const file = fileFactory.build();
    const dataset = datasetFactory.build();

    processorRepositoryMock.getAllowedMimeTypes.mockResolvedValueOnce([
      "text/csv",
    ]);
    storageProviderMock.generateUploadSignedUrl.mockResolvedValueOnce(file);
    datasetRepositoryMock.createOne.mockResolvedValueOnce(dataset);

    await userDatasetCreateService.execute({
      data: buildData({ description: null, tags: null }),
      user,
      language: "en",
    });

    expect(datasetRepositoryMock.createOne).toHaveBeenCalledWith(
      expect.objectContaining({ description: null, tags: null }),
    );
  });

  it("should throw if the description is invalid", async () => {
    await expect(() =>
      userDatasetCreateService.execute({
        data: buildData({ description: 123 as unknown as string }),
        user: userFactory.build(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/INVALID_DESCRIPTION",
      }),
    );
  });

  it("should throw if the tags are invalid", async () => {
    await expect(() =>
      userDatasetCreateService.execute({
        data: buildData({ tags: "one,,three" }),
        user: userFactory.build(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/TAGS_NOT_PROVIDED",
      }),
    );
  });

  it("should throw if the mime type is not accepted by any processor", async () => {
    processorRepositoryMock.getAllowedMimeTypes.mockResolvedValueOnce([
      "image/png",
    ]);

    await expect(() =>
      userDatasetCreateService.execute({
        data: buildData(),
        user: userFactory.build(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/MIME_TYPE_NOT_ACCEPTED_BY_ANY_PROCESSOR",
      }),
    );
  });
});
