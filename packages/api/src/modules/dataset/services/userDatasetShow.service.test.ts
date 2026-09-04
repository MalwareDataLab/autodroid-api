import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { container } from "tsyringe";
import { createHash } from "node:crypto";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Repository import
import {
  IFileRepository,
  IUserRepository,
} from "@shared/container/repositories";
import { IDatasetRepository } from "../repositories/IDataset.repository";

// Service import
import { UserDatasetShowService } from "./userDatasetShow.service";

describe("Service: UserDatasetShowService", () => {
  let user: User;
  let datasetRepository: IDatasetRepository;
  let fileRepository: IFileRepository;

  let userDatasetShowService: UserDatasetShowService;

  beforeEach(async () => {
    datasetRepository = container.resolve("DatasetRepository");
    fileRepository = container.resolve("FileRepository");

    const userRepository = container.resolve<IUserRepository>("UserRepository");
    user = await userRepository.createOne({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      language: "en",
      phone_number: null,
      learning_data: {},
      notifications_enabled: true,
    });

    userDatasetShowService = new UserDatasetShowService(datasetRepository);
  });

  it("should get one dataset", async () => {
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
      upload_url: null,
      upload_url_expires_at: null,
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

    const response = await userDatasetShowService.execute({
      dataset_id: dataset.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(dataset);
  });

  it("should throw if dataset was not found", async () => {
    await expect(() =>
      userDatasetShowService.execute({
        dataset_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@dataset_guard/DATASET_NOT_FOUND",
      }),
    );
  });
});
