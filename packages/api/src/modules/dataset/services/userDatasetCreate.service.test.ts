import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";
import { IDatasetRepository } from "../repositories/IDataset.repository";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Schema import
import { UserDatasetCreateSchema } from "../schemas/userDataset.schema";

// Service import
import { UserDatasetCreateService } from "./userDatasetCreate.service";

describe("Service: UserDatasetCreateService", () => {
  let datasetRepository: IDatasetRepository;
  let processorRepository: IProcessorRepository;
  let storageProvider: IStorageProvider;

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
    datasetRepository = container.resolve("DatasetRepository");
    processorRepository = container.resolve("ProcessorRepository");
    storageProvider = container.resolve("StorageProvider");

    userDatasetCreateService = new UserDatasetCreateService(
      datasetRepository,
      processorRepository,
      storageProvider,
    );
  });

  it("should create a dataset with description and tags", async () => {
    const user = await userFactory.create();
    await processorFactory.create({ allowed_mime_types: MIME_TYPE.CSV });
    const file = await fileFactory.create({ type: FILE_TYPE.DATASET });

    vi.spyOn(storageProvider, "generateUploadSignedUrl").mockResolvedValueOnce(
      file,
    );

    const response = await userDatasetCreateService.execute({
      data: buildData({ description: "  hello  ", tags: "a, b ,c" }),
      user,
      language: "en",
    });

    expect(response).toMatchObject({
      user_id: user.id,
      file_id: file.id,
      description: "hello",
      tags: "a,b,c",
    });

    const found = await datasetRepository.findOne({ id: response.id });
    expect(found?.description).toBe("hello");
  });

  it("should create a dataset without description and tags", async () => {
    const user = await userFactory.create();
    await processorFactory.create({ allowed_mime_types: MIME_TYPE.CSV });
    const file = await fileFactory.create({ type: FILE_TYPE.DATASET });

    vi.spyOn(storageProvider, "generateUploadSignedUrl").mockResolvedValueOnce(
      file,
    );

    const response = await userDatasetCreateService.execute({
      data: buildData({ description: null, tags: null }),
      user,
      language: "en",
    });

    expect(response.description).toBeNull();
    expect(response.tags).toBeNull();
  });

  it("should throw if the description is invalid", async () => {
    const user = await userFactory.create();

    await expect(() =>
      userDatasetCreateService.execute({
        data: buildData({ description: 123 as unknown as string }),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/INVALID_DESCRIPTION",
      }),
    );
  });

  it("should throw if the tags are invalid", async () => {
    const user = await userFactory.create();

    await expect(() =>
      userDatasetCreateService.execute({
        data: buildData({ tags: "one,,three" }),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/TAGS_NOT_PROVIDED",
      }),
    );
  });

  it("should throw if the mime type is not accepted by any processor", async () => {
    await processorFactory.create({ allowed_mime_types: "image/png" });
    const user = await userFactory.create();

    await expect(() =>
      userDatasetCreateService.execute({
        data: buildData(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_dataset_create_service/MIME_TYPE_NOT_ACCEPTED_BY_ANY_PROCESSOR",
      }),
    );
  });
});
