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
import { UserProcessingUpdateVisibilityService } from "./userProcessingUpdateVisibility.service";

describe("Service: UserProcessingUpdateVisibilityService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let userProcessingUpdateVisibilityService: UserProcessingUpdateVisibilityService;

  const user = userFactory.build();

  const seed = () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = processingFactory.build({
      visibility: PROCESSING_VISIBILITY.PRIVATE,
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

    userProcessingUpdateVisibilityService =
      new UserProcessingUpdateVisibilityService(
        processingRepositoryMock,
        datasetRepositoryMock,
        processorRepositoryMock,
      );
  });

  it("should update the processing visibility", async () => {
    const { processing } = seed();
    const updatedProcessing = processingFactory.build({
      id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });

    processingRepositoryMock.updateOne.mockResolvedValueOnce(updatedProcessing);

    const response = await userProcessingUpdateVisibilityService.execute({
      user,
      processing_id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
      language: "en",
    });

    expect(response).toBe(updatedProcessing);
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: processing.id },
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
    );
  });

  it("should throw when the processing does not belong to the user", async () => {
    const { processing } = seed();
    processing.user_id = faker.string.uuid();
    processing.visibility = PROCESSING_VISIBILITY.PUBLIC;

    await expect(() =>
      userProcessingUpdateVisibilityService.execute({
        user,
        processing_id: processing.id,
        visibility: PROCESSING_VISIBILITY.PRIVATE,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_update_visibility_service/CANNOT_UPDATE_PROCESSING_VISIBILITY",
      }),
    );
  });

  it("should throw when the processing was not found after update", async () => {
    const { processing } = seed();

    processingRepositoryMock.updateOne.mockResolvedValueOnce(
      null as unknown as ReturnType<typeof processingFactory.build>,
    );

    await expect(() =>
      userProcessingUpdateVisibilityService.execute({
        user,
        processing_id: processing.id,
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_update_visibility_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
      }),
    );
  });
});
