import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { UserProcessingShowService } from "./userProcessingShow.service";

describe("Service: UserProcessingShowService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let userProcessingShowService: UserProcessingShowService;

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

    userProcessingShowService = new UserProcessingShowService(
      processingRepositoryMock,
      datasetRepositoryMock,
      processorRepositoryMock,
    );
  });

  it("should return the processing", async () => {
    const { processing } = seed();
    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    const response = await userProcessingShowService.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response).toBe(processing);
  });

  it("should throw when the processing was not found", async () => {
    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      userProcessingShowService.execute({
        user,
        processing_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSING_NOT_FOUND",
      }),
    );
  });
});
