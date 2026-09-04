import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Service import
import { AdminProcessingDeleteService } from "./adminProcessingDelete.service";

describe("Service: AdminProcessingDeleteService", () => {
  let storageProviderMock: Mocked<IStorageProvider>;
  let processingRepositoryMock: Mocked<IProcessingRepository>;

  let adminProcessingDeleteService: AdminProcessingDeleteService;

  beforeEach(() => {
    storageProviderMock = {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(),
      refreshFile: vi.fn(),
      removeFileByPath: vi.fn(),
    } as unknown as Mocked<IStorageProvider>;

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

    adminProcessingDeleteService = new AdminProcessingDeleteService(
      storageProviderMock,
      processingRepositoryMock,
    );
  });

  it("should delete a processing removing its result and metrics files", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const resultFile = fileFactory.build();
    const metricsFile = fileFactory.build();
    const processing = processingFactory.build(
      {},
      {
        associations: {
          result_file: resultFile,
          metrics_file: metricsFile,
        },
      },
    );

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.deleteOne.mockResolvedValueOnce(processing);
    storageProviderMock.removeFileByPath.mockResolvedValue(
      faker.system.filePath(),
    );

    const response = await adminProcessingDeleteService.execute({
      processing_id: processing.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(processing);
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledWith({
      path: resultFile.provider_path,
      language: "en",
    });
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledWith({
      path: metricsFile.provider_path,
      language: "en",
    });
    expect(processingRepositoryMock.deleteOne).toHaveBeenCalledWith({
      id: processing.id,
    });
  });

  it("should delete a processing without result or metrics files", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processing = processingFactory.build();

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processingRepositoryMock.deleteOne.mockResolvedValueOnce(processing);

    const response = await adminProcessingDeleteService.execute({
      processing_id: processing.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(processing);
    expect(storageProviderMock.removeFileByPath).not.toHaveBeenCalled();
    expect(processingRepositoryMock.deleteOne).toHaveBeenCalledWith({
      id: processing.id,
    });
  });

  it("should throw if the processing was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminProcessingDeleteService.execute({
        processing_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processing_delete_service/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessingDeleteService.execute({
        processing_id: faker.string.uuid(),
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
