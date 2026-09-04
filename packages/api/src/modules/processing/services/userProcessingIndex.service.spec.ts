import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Schema import

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { ProcessingIndexSchema } from "../schemas/processingIndex.schema";
import { processingFactory } from "../entities/factories/processing.factory";

// Service import
import { UserProcessingIndexService } from "./userProcessingIndex.service";

describe("Service: UserProcessingIndexService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let userProcessingIndexService: UserProcessingIndexService;

  const user = userFactory.build();

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

    userProcessingIndexService = new UserProcessingIndexService(
      processingRepositoryMock,
      datasetRepositoryMock,
      processorRepositoryMock,
    );
  });

  it("should return a paginated list of processes", async () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = processingFactory.build({
      user_id: user.id,
      dataset_id: dataset.id,
      processor_id: processor.id,
    });

    datasetRepositoryMock.findOne.mockResolvedValue(dataset);
    processorRepositoryMock.findOne.mockResolvedValue(processor);
    processingRepositoryMock.getCountPublicOrUserPrivate.mockResolvedValueOnce(
      1,
    );
    processingRepositoryMock.findManyPublicOrUserPrivate.mockResolvedValueOnce([
      processing,
    ]);

    const params = {
      dataset_id: dataset.id,
      processor_id: processor.id,
    } as ProcessingIndexSchema;

    const response = await userProcessingIndexService.execute({
      user,
      params,
      language: "en",
    });

    expect(response.totalCount).toBe(1);
    expect(response.edges).toHaveLength(1);
    expect(
      processingRepositoryMock.getCountPublicOrUserPrivate,
    ).toHaveBeenCalled();
  });
});
