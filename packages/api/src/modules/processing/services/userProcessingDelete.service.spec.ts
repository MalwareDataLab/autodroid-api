import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { UserProcessingDeleteService } from "./userProcessingDelete.service";

describe("Service: UserProcessingDeleteService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;
  let storageProviderMock: Mocked<IStorageProvider>;

  let userProcessingDeleteService: UserProcessingDeleteService;

  const user = userFactory.build();

  const seed = () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = processingFactory.build({
      visibility: PROCESSING_VISIBILITY.PUBLIC,
      user_id: user.id,
      dataset_id: dataset.id,
      processor_id: processor.id,
    });

    processingRepositoryMock.findOne.mockResolvedValue(processing);
    datasetRepositoryMock.findOne.mockResolvedValue(dataset);
    processorRepositoryMock.findOne.mockResolvedValue(processor);

    return { dataset, processor, processing };
  };

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

    datasetRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    processorRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getAllowedMimeTypes: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
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

    userProcessingDeleteService = new UserProcessingDeleteService(
      processingRepositoryMock,
      datasetRepositoryMock,
      processorRepositoryMock,
      storageProviderMock,
    );
  });

  it("should delete a processing removing its files", async () => {
    const { processing } = seed();
    processing.result_file = fileFactory.build();
    processing.metrics_file = fileFactory.build();

    storageProviderMock.removeFileByPath.mockResolvedValue("removed");
    processingRepositoryMock.deleteOne.mockResolvedValueOnce(processing);

    const response = await userProcessingDeleteService.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response).toBe(processing);
    expect(storageProviderMock.removeFileByPath).toHaveBeenCalledTimes(2);
    expect(processingRepositoryMock.deleteOne).toHaveBeenCalledWith({
      id: processing.id,
    });
  });

  it("should delete a processing without files", async () => {
    const { processing } = seed();

    processingRepositoryMock.deleteOne.mockResolvedValueOnce(processing);

    const response = await userProcessingDeleteService.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response).toBe(processing);
    expect(storageProviderMock.removeFileByPath).not.toHaveBeenCalled();
  });

  it("should throw when the processing does not belong to the user", async () => {
    const { processing } = seed();
    processing.user_id = faker.string.uuid();

    await expect(() =>
      userProcessingDeleteService.execute({
        user,
        processing_id: processing.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_delete_service/CANNOT_DELETE_PROCESSING",
      }),
    );
  });
});
