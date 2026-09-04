import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

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
import { UserProcessingExtendKeepUntilService } from "./userProcessingExtendKeepUntil.service";

describe("Service: UserProcessingExtendKeepUntilService", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let userProcessingExtendKeepUntilService: UserProcessingExtendKeepUntilService;

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

    userProcessingExtendKeepUntilService =
      new UserProcessingExtendKeepUntilService(
        processingRepositoryMock,
        datasetRepositoryMock,
        processorRepositoryMock,
      );
  });

  it("should extend the keep until date", async () => {
    const { processing } = seed();
    const keep_until = DateUtils.now().add(1, "day").toDate();

    processingRepositoryMock.updateOne.mockResolvedValueOnce(processing);

    const response = await userProcessingExtendKeepUntilService.execute({
      user,
      processing_id: processing.id,
      keep_until,
      language: "en",
    });

    expect(response).toBe(processing);
    expect(processingRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: processing.id },
      { keep_until },
    );
  });

  it("should throw when the processing does not belong to the user", async () => {
    const { processing } = seed();
    processing.user_id = faker.string.uuid();

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: processing.id,
        keep_until: DateUtils.now().add(1, "day").toDate(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/CANNOT_EXTEND_PROCESSING_KEEP_UNTIL",
      }),
    );
  });

  it("should throw when the keep until date is invalid", async () => {
    const { processing } = seed();

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: processing.id,
        keep_until: new Date("invalid"),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/INVALID_KEEP_UNTIL",
      }),
    );
  });

  it("should throw when the keep until date exceeds the allowed range", async () => {
    const { processing } = seed();

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: processing.id,
        keep_until: DateUtils.now().add(60, "days").toDate(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/KEEP_UNTIL_EXCEEDED",
      }),
    );
  });

  it("should throw when the processing was not found after update", async () => {
    const { processing } = seed();

    processingRepositoryMock.updateOne.mockResolvedValueOnce(
      null as unknown as ReturnType<typeof processingFactory.build>,
    );

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: processing.id,
        keep_until: DateUtils.now().add(1, "day").toDate(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
      }),
    );
  });
});
