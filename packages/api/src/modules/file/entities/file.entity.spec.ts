import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { container } from "tsyringe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Repository import
import { IFileRepository } from "../repositories/IFile.repository";

// Target import
import { File } from "./file.entity";

const REFRESHED_PUBLIC_URL = "https://storage.example.com/refreshed.csv";

const privateFileData = () => ({
  id: "file-1",
  provider_path: "test/datasets/file-1.csv",
  allow_public_access: false,
  upload_url: null,
  upload_url_expires_at: null,
  public_url: null,
  public_url_expires_at: null,
});

const publicFileData = () => ({
  ...privateFileData(),
  allow_public_access: true,
});

describe("Entity: File", () => {
  beforeEach(() => {
    container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => {
        throw new Error("Not expected.");
      },
      refreshFile: async ({ file }) =>
        plainToInstance(File, { ...file, public_url: REFRESHED_PUBLIC_URL }),
      removeFileByPath: async () => {
        throw new Error("Not expected.");
      },
    });
    container.registerInstance<IFileRepository>(
      "FileRepository",
      {} as IFileRepository,
    );
  });

  afterEach(() => {
    container.clearInstances();
  });

  it.for([
    ["a File instance", plainToInstance(File, privateFileData()), true],
    ["a plain object tagged as a File", { __type: "File" }, true],
    ["a plain object tagged as something else", { __type: "Dataset" }, false],
    ["a plain object without a tag", privateFileData(), false],
  ] as const)("should tell whether %s is a file", ([, candidate, expected]) => {
    expect(File.isFile(candidate)).toBe(expected);
  });

  it("should process a file through its public access, refreshing a public file", async () => {
    const processed = await File.process(
      plainToInstance(File, publicFileData()),
    );

    expect(processed).toBeInstanceOf(File);
    expect(processed).toMatchObject({
      ...publicFileData(),
      public_url: REFRESHED_PUBLIC_URL,
    });
  });

  it("should process every nested file of another entity, leaving a private file as it is", async () => {
    const processed = await File.processAnyNested({
      cls: Dataset,
      data: plainToInstance(Dataset, {
        id: "dataset-1",
        file: plainToInstance(File, privateFileData()),
      }),
    });

    expect(processed).toBeInstanceOf(Dataset);
    expect(processed.file).toBeInstanceOf(File);
    expect(processed).toMatchObject({
      id: "dataset-1",
      file: privateFileData(),
    });
  });
});
