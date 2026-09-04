import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IFileRepository } from "@shared/container/repositories";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";

describe("Repository: PrismaFileRepository", () => {
  let repository: IFileRepository;

  beforeEach(() => {
    repository = container.resolve("FileRepository");
  });

  it("should create and find one file", async () => {
    const file = await fileFactory.create();

    const found = await repository.findOne({ id: file.id });

    expect(found?.id).toBe(file.id);
  });

  it("should create a file defaulting the payload when it is not provided", async () => {
    const created = await repository.createOne({
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.READY,
      provider_verified_at: faker.date.recent(),
      type: FILE_TYPE.DATASET,
      upload_url: faker.internet.url(),
      upload_url_expires_at: faker.date.future(),
      allow_public_access: false,
      filename: faker.system.fileName(),
      md5_hash: faker.git.commitSha(),
      mime_type: MIME_TYPE.CSV,
      public_url: null,
      public_url_expires_at: null,
      size: 2048,
    } as any);

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.payload).toEqual({});
  });

  it("should return null finding a file that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find many files by provider status", async () => {
    const file = await fileFactory.create({
      provider_status: FILE_PROVIDER_STATUS.READY,
    });

    const result = await repository.findMany({
      provider_status: FILE_PROVIDER_STATUS.READY,
    });

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: file.id })]),
    );
  });

  it("should find many files filtered by upload url expiration window", async () => {
    const file = await fileFactory.create({
      upload_url_expires_at: faker.date.future(),
    });

    const result = await repository.findMany({
      provider_status: file.provider_status,
      upload_url_expires_start_date: faker.date.past(),
      upload_url_expires_end_date: faker.date.future({ years: 5 }),
    });

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: file.id })]),
    );
  });

  it("should update one file", async () => {
    const file = await fileFactory.create();

    const updated = await repository.updateOne(
      { id: file.id },
      { filename: "updated-file.csv" },
    );

    expect(updated).toMatchObject({
      id: file.id,
      filename: "updated-file.csv",
    });

    const found = await repository.findOne({ id: file.id });
    expect(found?.filename).toBe("updated-file.csv");
  });

  it("should return null updating a file that does not exist", async () => {
    const updated = await repository.updateOne(
      { id: faker.string.uuid() },
      { filename: "nope.csv" },
    );

    expect(updated).toBeNull();
  });

  it("should delete one file", async () => {
    const file = await fileFactory.create();

    const deleted = await repository.deleteOne({ id: file.id });

    expect(deleted?.id).toBe(file.id);

    const found = await repository.findOne({ id: file.id });
    expect(found).toBeNull();
  });

  it("should return null deleting a file that does not exist", async () => {
    const deleted = await repository.deleteOne({ id: faker.string.uuid() });

    expect(deleted).toBeNull();
  });
});
