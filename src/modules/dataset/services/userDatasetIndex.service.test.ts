import { beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { faker } from "@faker-js/faker";
import { User } from "@modules/user/entities/user.entity";
import { container } from "tsyringe";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import {
  IFileRepository,
  IUserRepository,
} from "@shared/container/repositories";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { IDatasetRepository } from "../repositories/IDataset.repository";
import { UserDatasetIndexService } from "./userDatasetIndex.service";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

describe("Service: UserDatasetIndexService", () => {
  let user: User;
  let datasetRepository: IDatasetRepository;
  let fileRepository: IFileRepository;

  let userDatasetIndexService: UserDatasetIndexService;

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

    userDatasetIndexService = new UserDatasetIndexService(datasetRepository);
  });

  it("should list datasets", async () => {
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

    const response = await userDatasetIndexService.execute({
      user,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(dataset),
          }),
        ]),
      }),
    );
  });
});
