import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IFileRepository } from "../repositories/IFile.repository";

// Enum import
import { STORAGE_PROVIDER } from "../types/storageProvider.enum";

// Factory import
import { fileFactory } from "../entities/factories/file.factory";

// Service import
import { RemoveAllDanglingFilesService } from "./removeAllDanglingFiles.service";

describe("Service: RemoveAllDanglingFilesService", () => {
  let fileRepositoryMock: Mocked<IFileRepository>;
  let storageProviderMock: Mocked<IStorageProvider>;

  let removeAllDanglingFilesService: RemoveAllDanglingFilesService;

  beforeEach(() => {
    fileRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
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

    removeAllDanglingFilesService = new RemoveAllDanglingFilesService(
      fileRepositoryMock,
      storageProviderMock,
    );
  });

  it("should refresh expired uploads and remove not found files", async () => {
    const expiredOne = fileFactory.build();
    const expiredTwo = fileFactory.build();
    const removableOne = fileFactory.build();
    const removableTwo = fileFactory.build();

    fileRepositoryMock.findMany
      .mockResolvedValueOnce([expiredOne, expiredTwo])
      .mockResolvedValueOnce([removableOne, removableTwo]);

    storageProviderMock.refreshFile
      .mockResolvedValueOnce(expiredOne)
      .mockRejectedValueOnce(new Error("refresh failed"));

    storageProviderMock.removeFileByPath
      .mockResolvedValueOnce(removableOne.provider_path)
      .mockRejectedValueOnce(new Error("remove failed"));

    const count = await removeAllDanglingFilesService.execute();

    expect(count).toBe(1);
    expect(storageProviderMock.refreshFile).toHaveBeenCalledTimes(2);
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledTimes(2);
  });

  it("should return zero when there are no dangling files", async () => {
    fileRepositoryMock.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const count = await removeAllDanglingFilesService.execute();

    expect(count).toBe(0);
    expect(storageProviderMock.removeFileByPath).not.toHaveBeenCalled();
  });
});
