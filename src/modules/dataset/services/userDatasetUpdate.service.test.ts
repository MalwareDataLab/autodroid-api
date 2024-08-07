import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@shared/errors/AppError";
import { User } from "@modules/user/entities/user.entity";
import { container } from "tsyringe";
import {
  IFileRepository,
  IUserRepository,
} from "@shared/container/repositories";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { faker } from "@faker-js/faker";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { createHash } from "node:crypto";
import { UserDatasetUpdateService } from "./userDatasetUpdate.service";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

describe("Service: UserDatasetUpdateService", () => {
  let user: User;
  let datasetRepository: IDatasetRepository;
  let fileRepository: IFileRepository;

  let userDatasetUpdateService: UserDatasetUpdateService;

  beforeEach(async () => {
    datasetRepository = container.resolve("DatasetRepository");
    fileRepository = container.resolve("FileRepository");

    const userRepository = container.resolve<IUserRepository>("UserRepository");
    user = await userRepository.createOne({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      language: "en",
      phone_number: null,
    });

    userDatasetUpdateService = new UserDatasetUpdateService(datasetRepository);
  });

  it("should update a dataset", async () => {
    const data = {
      description: "Updated description",
      tags: "updated,tags,one,two,three",
    };

    const file = await fileRepository.createOne({
      filename: faker.system.fileName(),
      mime_type: MIME_TYPE.CSV,
      payload: {},
      size: 1024,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      provider_verified_at: null,
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      public_url: null,
      public_url_expires_at: null,
      md5_hash: createHash("md5")
        .update(faker.string.alphanumeric(10))
        .digest("hex"),
    });

    const { updated_at, ...dataset } = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    const expected = {
      ...dataset,
      ...data,
    };

    const response = await userDatasetUpdateService.execute({
      dataset_id: dataset.id,
      data,
      user,
      language: "en",
    });

    expect(response).toMatchObject(expected);
  });

  it("should update a dataset with null description and tags", async () => {
    const data = {
      description: null,
      tags: null,
    };

    const file = await fileRepository.createOne({
      filename: faker.system.fileName(),
      mime_type: MIME_TYPE.CSV,
      payload: {},
      size: 1024,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      provider_verified_at: null,
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      public_url: null,
      public_url_expires_at: null,
      md5_hash: createHash("md5")
        .update(faker.string.alphanumeric(10))
        .digest("hex"),
    });

    const { updated_at, ...dataset } = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    const expected = {
      ...dataset,
      ...data,
    };

    const response = await userDatasetUpdateService.execute({
      dataset_id: dataset.id,
      data,
      user,
      language: "en",
    });

    expect(response).toMatchObject(expected);
  });

  it("should throw if the dataset was not found after update", async () => {
    const data = {
      description: null,
      tags: null,
    };

    const file = await fileRepository.createOne({
      filename: faker.system.fileName(),
      mime_type: MIME_TYPE.CSV,
      payload: {},
      size: 1024,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      provider_verified_at: null,
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      public_url: null,
      public_url_expires_at: null,
      md5_hash: createHash("md5")
        .update(faker.string.alphanumeric(10))
        .digest("hex"),
    });

    const dataset = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_UPDATED",
      message: "Dataset not updated.",
    });

    vi.spyOn(datasetRepository, "updateOne").mockResolvedValueOnce(null);

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });

  it("should throw if the tags are invalid", async () => {
    const data = {
      description: "Updated description",
      tags: "updated,tags,one,two,three,",
    };

    const file = await fileRepository.createOne({
      filename: faker.system.fileName(),
      mime_type: MIME_TYPE.CSV,
      payload: {},
      size: 1024,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      provider_verified_at: null,
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      public_url: null,
      public_url_expires_at: null,
      md5_hash: createHash("md5")
        .update(faker.string.alphanumeric(10))
        .digest("hex"),
    });

    const dataset = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    const expected = new AppError({
      key: "@dataset_update_service/TAGS_NOT_PROVIDED",
      message: "Tags must be a comma-separated list.",
    });

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });

  it("should throw if the description is invalid", async () => {
    const data = {
      description: 123 as unknown as string,
      tags: "updated,tags,one,two,three,",
    };

    const file = await fileRepository.createOne({
      filename: faker.system.fileName(),
      mime_type: MIME_TYPE.CSV,
      payload: {},
      size: 1024,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      provider_verified_at: null,
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      public_url: null,
      public_url_expires_at: null,
      md5_hash: createHash("md5")
        .update(faker.string.alphanumeric(10))
        .digest("hex"),
    });

    const dataset = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    const expected = new AppError({
      key: "@dataset_update_service/INVALID_DESCRIPTION",
      message: "Invalid description.",
    });

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });

  it("should throw if the dataset is not editable", async () => {
    const data = {
      description: 123 as unknown as string,
      tags: "updated,tags,one,two,three,",
    };

    const file = await fileRepository.createOne({
      filename: faker.system.fileName(),
      mime_type: MIME_TYPE.CSV,
      payload: {},
      size: 1024,
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      provider_verified_at: null,
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      public_url: null,
      public_url_expires_at: null,
      md5_hash: createHash("md5")
        .update(faker.string.alphanumeric(10))
        .digest("hex"),
    });

    const dataset = await datasetRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      file_id: file.id,
      visibility: DATASET_VISIBILITY.PUBLIC,
      user_id: user.id,
    });

    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_EDITABLE",
      message: "Dataset not editable.",
    });

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id: dataset.id,
        data,
        user,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });

  it("should throw if the dataset was not found", async () => {
    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_FOUND",
      message: "Dataset not found.",
    });

    expect(() =>
      userDatasetUpdateService.execute({
        dataset_id: faker.string.uuid(),
        data: {
          description: faker.word.words(3),
          tags: faker.word.words(1),
        },
        user,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });
});
