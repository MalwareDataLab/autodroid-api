import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Service import
import { AdminProcessingCleanExpiredService } from "./adminProcessingCleanExpired.service";

describe("Service: AdminProcessingCleanExpiredService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let storageProviderMock: Mocked<IStorageProvider>;

  let adminProcessingCleanExpiredService: AdminProcessingCleanExpiredService;

  beforeEach(() => {
    processingRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      getOneEstimatedExecutionTime: vi.fn(),
      getManyEstimatedExecutionTimes: vi.fn(),
    };

    storageProviderMock = {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    } as unknown as Mocked<IStorageProvider>;

    adminProcessingCleanExpiredService = new AdminProcessingCleanExpiredService(
      processingRepositoryMock,
      storageProviderMock,
    );
  });

  it("should clean expired processes", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    processingRepositoryMock.findMany.mockResolvedValueOnce([]);

    const response = await adminProcessingCleanExpiredService.execute({
      user,
      language: "en",
    });

    expect(response).toBe(0);
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessingCleanExpiredService.execute({
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
