import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { subDays } from "date-fns";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IFileRepository } from "../repositories/IFile.repository";

// Enum import
import { FILE_PROVIDER_STATUS } from "../types/fileProviderStatus.enum";
import { FILE_TYPE } from "../types/fileType.enum";

// Factory import
import { fileFactory } from "../entities/factories/file.factory";

// Service import
import { RemoveAllDanglingFilesService } from "./removeAllDanglingFiles.service";

describe("Service: RemoveAllDanglingFilesService", () => {
  let fileRepository: IFileRepository;
  let storageProvider: IStorageProvider;

  let removeAllDanglingFilesService: RemoveAllDanglingFilesService;

  beforeEach(() => {
    fileRepository = container.resolve("FileRepository");
    storageProvider = container.resolve("StorageProvider");

    removeAllDanglingFilesService = new RemoveAllDanglingFilesService(
      fileRepository,
      storageProvider,
    );
  });

  it("should refresh expired uploads and remove not found files", async () => {
    // PrismaFileRepository.findMany runs every returned row through
    // File.processAnyNested, which auto-calls storageProvider.refreshFile
    // for any file with allow_public_access/upload_url truthy — a real,
    // repository-wide side effect unrelated to this service. Keeping those
    // fields falsy here isolates the counts to what THIS service's own
    // explicit refresh loop does.
    const expiredOk = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      upload_url_expires_at: subDays(new Date(), 1),
      upload_url: null,
      allow_public_access: false,
      public_url: null,
    });
    const expiredFail = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      upload_url_expires_at: subDays(new Date(), 1),
      upload_url: null,
      allow_public_access: false,
      public_url: null,
    });
    const removableOk = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      provider_status: FILE_PROVIDER_STATUS.NOT_FOUND,
      upload_url: null,
      allow_public_access: false,
      public_url: null,
    });
    const removableFail = await fileFactory.create({
      type: FILE_TYPE.DATASET,
      provider_status: FILE_PROVIDER_STATUS.NOT_FOUND,
      upload_url: null,
      allow_public_access: false,
      public_url: null,
    });

    vi.spyOn(storageProvider, "refreshFile")
      .mockResolvedValueOnce(expiredOk)
      .mockRejectedValueOnce(new Error("refresh failed"));
    vi.spyOn(storageProvider, "removeFileByPath")
      .mockImplementation(async ({ path }) => {
        if (path === removableFail.provider_path)
          throw new Error("remove failed");
        return path;
      });

    const count = await removeAllDanglingFilesService.execute();

    expect(count).toBe(1);
    expect(storageProvider.refreshFile).toHaveBeenCalledTimes(2);
    expect(storageProvider.removeFileByPath).toHaveBeenCalledTimes(2);
    expect(expiredOk).toBeDefined();
    expect(removableOk).toBeDefined();
  });

  it("should return zero when there are no dangling files", async () => {
    const count = await removeAllDanglingFilesService.execute();

    expect(count).toBe(0);
    expect(storageProvider.removeFileByPath).not.toHaveBeenCalled();
  });
});
