import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Repository import
import { IFileRepository } from "@modules/file/repositories/IFile.repository";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Service import
import { AdminFileRemoveAllDanglingService } from "./adminFileRemoveAllDangling.service";

describe("Service: AdminFileRemoveAllDanglingService", () => {
  let fileRepositoryMock: Mocked<IFileRepository>;
  let storageProviderMock: Mocked<IStorageProvider>;

  let adminFileRemoveAllDanglingService: AdminFileRemoveAllDanglingService;

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
    } as unknown as Mocked<IStorageProvider>;

    adminFileRemoveAllDanglingService = new AdminFileRemoveAllDanglingService(
      fileRepositoryMock,
      storageProviderMock,
    );
  });

  it("should remove all dangling files", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    fileRepositoryMock.findMany.mockResolvedValue([]);

    const response = await adminFileRemoveAllDanglingService.execute({
      user,
      language: "en",
    });

    expect(response).toBe(0);
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminFileRemoveAllDanglingService.execute({
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
