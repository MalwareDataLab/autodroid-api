import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { addDays, subDays } from "date-fns";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Enum import
import { FILE_TYPE } from "../types/fileType.enum";

// Repository import
import { IFileRepository } from "../repositories/IFile.repository";

// Factory import
import { fileFactory } from "../entities/factories/file.factory";

// Service import
import { ProcessFilePublicAccessService } from "./processFilePublicAccess.service";

describe("Service: ProcessFilePublicAccessService", () => {
  let storageProvider: IStorageProvider;
  let fileRepository: IFileRepository;

  let processFilePublicAccessService: ProcessFilePublicAccessService;

  beforeEach(() => {
    storageProvider = container.resolve("StorageProvider");
    fileRepository = container.resolve("FileRepository");

    processFilePublicAccessService = new ProcessFilePublicAccessService(
      storageProvider,
      fileRepository,
    );
  });

  it("should resolve null/undefined data without touching any dependency", async () => {
    const storageProviderSpy = vi.spyOn(storageProvider, "refreshFile");
    const fileRepositorySpy = vi.spyOn(fileRepository, "updateOne");

    const result = await processFilePublicAccessService.execute({
      cls: {} as any,
      obj: null,
      language: "en",
    });

    expect(storageProviderSpy).not.toHaveBeenCalled();
    expect(fileRepositorySpy).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("should refresh a public file whose access is allowed", async () => {
    const file = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      allow_public_access: true,
      public_url: "https://old.example/file",
      public_url_expires_at: subDays(new Date(), 1),
    });

    vi.spyOn(storageProvider, "refreshFile").mockImplementationOnce(
      async ({ file: toRefresh }) =>
        Object.assign(toRefresh, { public_url: "https://refreshed.example" }),
    );

    const result = await processFilePublicAccessService.execute<
      { public_url: string | null },
      typeof file
    >({
      cls: class Test {},
      obj: file,
      language: "en",
    });

    expect(result.public_url).toBe("https://refreshed.example");
  });

  it("should refresh a file whose upload_url is still set", async () => {
    const file = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      upload_url: "https://upload.example",
      public_url: null,
      public_url_expires_at: null,
    });

    vi.spyOn(storageProvider, "refreshFile").mockImplementationOnce(
      async ({ file: toRefresh }) =>
        Object.assign(toRefresh, { upload_url: "https://renewed.example" }),
    );

    const result = await processFilePublicAccessService.execute<
      { upload_url: string | null },
      typeof file
    >({
      cls: class Test {},
      obj: file,
      language: "en",
    });

    expect(result.upload_url).toBe("https://renewed.example");
  });

  it("should not refresh when the public url has more than 30 minutes left", async () => {
    const file = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: "https://still-fresh.example",
      public_url_expires_at: DateUtils.now().add(31, "minutes").toDate(),
    });

    const storageProviderSpy = vi.spyOn(storageProvider, "refreshFile");

    const result = await processFilePublicAccessService.execute<
      { public_url: string | null },
      typeof file
    >({
      cls: class Test {},
      obj: file,
      language: "en",
    });

    expect(storageProviderSpy).not.toHaveBeenCalled();
    expect(result.public_url).toBe("https://still-fresh.example");
  });

  it("should remove public access and persist it for real when access is no longer allowed", async () => {
    const file = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      allow_public_access: true,
      upload_url: null,
      upload_url_expires_at: null,
      public_url: "https://about-to-be-removed.example",
      public_url_expires_at: addDays(new Date(), 1),
    });
    const stale = await fileRepository.updateOne(
      { id: file.id },
      { allow_public_access: false },
    );

    const result = await processFilePublicAccessService.execute<
      { public_url: string | null; allow_public_access: boolean },
      typeof stale
    >({
      cls: class Test {},
      obj: stale,
      language: "en",
    });

    expect(result.public_url).toBeNull();
    expect(result.allow_public_access).toBe(false);

    const found = await fileRepository.findOne({ id: file.id });
    expect(found?.public_url).toBeNull();
  });

  it("should resolve the original data when persisting the access removal fails", async () => {
    const file = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      allow_public_access: false,
      upload_url: null,
      public_url: "https://dangling.example",
      public_url_expires_at: addDays(new Date(), 1),
    });

    await fileRepository.deleteOne({ id: file.id });

    const result = await processFilePublicAccessService.execute<
      typeof file,
      typeof file
    >({
      cls: class Test {},
      obj: file,
      language: "en",
    });

    expect(result).toEqual(file);
  });

  it("should recurse through nested arrays and objects to find files", async () => {
    const refreshed = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      allow_public_access: true,
      public_url: "https://old.example/nested",
      public_url_expires_at: subDays(new Date(), 1),
    });

    vi.spyOn(storageProvider, "refreshFile").mockImplementationOnce(
      async ({ file: toRefresh }) =>
        Object.assign(toRefresh, { public_url: "https://nested-refreshed.example" }),
    );

    const wrapper = {
      plain: "value",
      nested: { file: refreshed },
      list: [null, refreshed],
    };

    const result = await processFilePublicAccessService.execute<
      typeof wrapper,
      typeof wrapper
    >({
      cls: class Test {},
      obj: wrapper,
      language: "en",
    });

    expect(result.plain).toBe("value");
    expect(result.nested.file.public_url).toBe(
      "https://nested-refreshed.example",
    );
    expect(result.list[0]).toBeNull();
  });
});
