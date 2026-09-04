import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";
import { processingFactory } from "../entities/factories/processing.factory";

// Guard import
import { ProcessingGuard } from "./processing.guard";

describe("Guard: ProcessingGuard", () => {
  let processingRepositoryMock: Mocked<IProcessingRepository>;
  let datasetRepositoryMock: Mocked<IDatasetRepository>;
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let processingGuard: ProcessingGuard;

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

    processingGuard = new ProcessingGuard(
      processingRepositoryMock,
      datasetRepositoryMock,
      processorRepositoryMock,
    );
  });

  it("should return everything when all entities are public", async () => {
    const user = { id: faker.string.uuid(), is_admin: false } as User;
    const processing = processingFactory.build({
      visibility: PROCESSING_VISIBILITY.PUBLIC,
      user_id: faker.string.uuid(),
    });
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      user_id: faker.string.uuid(),
    });
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PUBLIC,
      user_id: faker.string.uuid(),
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);
    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    const response = await processingGuard.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response.processing).toBe(processing);
    expect(response.processor).toBe(processor);
    expect(response.dataset).toBe(dataset);
    expect(response.t).toBeTypeOf("function");
  });

  it("should bypass every visibility check for an admin", async () => {
    const user = { id: faker.string.uuid(), is_admin: true } as User;
    const processing = processingFactory.build({
      visibility: PROCESSING_VISIBILITY.PRIVATE,
      user_id: faker.string.uuid(),
    });
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: faker.string.uuid(),
    });
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: faker.string.uuid(),
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);
    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    const response = await processingGuard.execute({
      user,
      processing_id: processing.id,
      processor_id: processor.id,
      dataset_id: dataset.id,
      language: "en",
    });

    expect(response.processing).toBe(processing);
    expect(response.processor).toBe(processor);
    expect(response.dataset).toBe(dataset);
  });

  it("should return private entities when the requester owns them", async () => {
    const user = { id: faker.string.uuid(), is_admin: false } as User;
    const processing = processingFactory.build({
      visibility: PROCESSING_VISIBILITY.PRIVATE,
      user_id: user.id,
    });
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: user.id,
    });
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: user.id,
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);
    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);
    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    const response = await processingGuard.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response.processing).toBe(processing);
  });

  it("should return undefined entities when no id is provided", async () => {
    const user = { id: faker.string.uuid(), is_admin: false } as User;

    const response = await processingGuard.execute({
      user,
      language: "en",
    });

    expect(response.processing).toBeUndefined();
    expect(response.processor).toBeUndefined();
    expect(response.dataset).toBeUndefined();
    expect(processingRepositoryMock.findOne).not.toHaveBeenCalled();
    expect(processorRepositoryMock.findOne).not.toHaveBeenCalled();
    expect(datasetRepositoryMock.findOne).not.toHaveBeenCalled();
  });

  it("should throw if the processing was not found", async () => {
    processingRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      processingGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        processing_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw if a non-admin requests a private processing they do not own", async () => {
    const processing = processingFactory.build({
      visibility: PROCESSING_VISIBILITY.PRIVATE,
      user_id: faker.string.uuid(),
    });

    processingRepositoryMock.findOne.mockResolvedValueOnce(processing);

    await expect(() =>
      processingGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        processing_id: processing.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSOR_NOT_PUBLIC",
      }),
    );
  });

  it("should throw if the processor was not found", async () => {
    processorRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      processingGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        processor_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSOR_NOT_FOUND",
      }),
    );
  });

  it("should throw if a non-admin requests a private processor they do not own", async () => {
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: faker.string.uuid(),
    });

    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    await expect(() =>
      processingGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        processor_id: processor.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSOR_NOT_PUBLIC",
      }),
    );
  });

  it("should throw if the dataset was not found", async () => {
    datasetRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      processingGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        dataset_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/DATASET_NOT_FOUND",
      }),
    );
  });

  it("should throw if a non-admin requests a private dataset they do not own", async () => {
    const dataset = datasetFactory.build({
      visibility: DATASET_VISIBILITY.PRIVATE,
      user_id: faker.string.uuid(),
    });

    datasetRepositoryMock.findOne.mockResolvedValueOnce(dataset);

    await expect(() =>
      processingGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        dataset_id: dataset.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/DATASET_NOT_PUBLIC",
      }),
    );
  });
});
