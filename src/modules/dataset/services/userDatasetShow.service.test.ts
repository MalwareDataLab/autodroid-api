import { beforeEach, describe, expect, it } from "vitest";

import { faker } from "@faker-js/faker";
import { AppError } from "@shared/errors/AppError";
import { User } from "@modules/user/entities/user.entity";
import {
  IFileRepository,
  IUserRepository,
} from "@shared/container/repositories";
import { container } from "tsyringe";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { createHash } from "node:crypto";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";
import { UserDatasetShowService } from "./userDatasetShow.service";
import { IDatasetRepository } from "../repositories/IDataset.repository";

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
    const expected = new AppError({
      key: "@dataset_update_service/DATASET_NOT_FOUND",
      message: "Dataset not found.",
    });

    expect(() =>
      userDatasetShowService.execute({
        dataset_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });
});
