import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Repository import
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Factory import
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { ProcessingCleanExpiredService } from "./processingCleanExpired.service";

describe("Service: ProcessingCleanExpiredService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let storageProviderMock: Mocked<IStorageProvider>;

  let processingCleanExpiredService: ProcessingCleanExpiredService;

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
    };

    processingCleanExpiredService = new ProcessingCleanExpiredService(
      processingRepositoryMock,
      storageProviderMock,
    );
  });

  it("should remove expired processes with and without files", async () => {
    const processingWithFiles = processingFactory.build();
    processingWithFiles.result_file = fileFactory.build();
    processingWithFiles.metrics_file = fileFactory.build();

    const processingWithoutFiles = processingFactory.build();

    processingRepositoryMock.findMany.mockResolvedValueOnce([
      processingWithFiles,
      processingWithoutFiles,
    ]);
    storageProviderMock.removeFileByPath.mockResolvedValue("removed");
    processingRepositoryMock.deleteOne.mockResolvedValue(processingWithFiles);

    const response = await processingCleanExpiredService.execute();

    expect(response).toBe(2);
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledTimes(2);
    expect(processingRepositoryMock.deleteOne).toHaveBeenCalledTimes(2);
  });

  it("should not increment the count when a removal fails", async () => {
    const processing = processingFactory.build();
    processing.result_file = fileFactory.build();

    processingRepositoryMock.findMany.mockResolvedValueOnce([processing]);
    storageProviderMock.removeFileByPath.mockRejectedValueOnce(new Error());

    const response = await processingCleanExpiredService.execute();

    expect(response).toBe(0);
    expect(processingRepositoryMock.deleteOne).not.toHaveBeenCalled();
  });
});
