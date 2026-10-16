import { faker } from "@faker-js/faker";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Constant import
import { TAKE_DEFAULT } from "@modules/pagination/constants/paginationLimit.constant";

// Enum import
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processor } from "@modules/processor/entities/processor.entity";
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("Repository: PrismaProcessingRepository", () => {
  let repository: IProcessingRepository;
  let user: User;
  let dataset: Dataset;
  let processor: Processor;

  beforeEach(async () => {
    repository = container.resolve("ProcessingRepository");
    user = await userFactory.create();
    dataset = await datasetFactory.create({ user_id: user.id });
    processor = await processorFactory.create({ user_id: user.id });
  });

  it("should create and find one processing", async () => {
    const created = await repository.createOne({
      status: PROCESSING_STATUS.PENDING,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
      started_at: null,
      finished_at: null,
      keep_until: null,
      verified_at: null,
      attempts: 0,
      message: null,
      reported_at: null,
      configuration: {},
      payload: {},
      user_id: user.id,
      dataset_id: dataset.id,
      processor_id: processor.id,
      worker_id: null,
      result_file_id: null,
      metrics_file_id: null,
    });

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.user_id).toBe(user.id);
    expect(found?.dataset_id).toBe(dataset.id);
    expect(found?.processor_id).toBe(processor.id);
  });

  it("should refresh the download link of each file a found processing produced", async () => {
    const downloadLinkExpiresAt = new Date("2030-01-01T00:00:00.000Z");
    container.registerInstance<IStorageProvider>("StorageProvider", {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: async () => fileFactory.build(),
      refreshFile: async ({ file }) => ({
        ...file,
        public_url: `https://storage.example.test/download/${file.id}`,
        public_url_expires_at: downloadLinkExpiresAt,
      }),
      removeFileByPath: async () => "",
    });
    const resultFile = await fileFactory.create({
      type: FILE_TYPE.PROCESSING_RESULT,
      public_url: null,
      public_url_expires_at: null,
    });
    const processing = await processingFactory.create(
      { result_file_id: resultFile.id },
      { associations: { user, dataset, processor } },
    );

    const found = await repository.findOne({ id: processing.id });

    expect(found?.result_file).toEqual(
      expect.objectContaining({
        id: resultFile.id,
        public_url: `https://storage.example.test/download/${resultFile.id}`,
        public_url_expires_at: downloadLinkExpiresAt,
      }),
    );
    expect(found?.metrics_file).toEqual(
      expect.objectContaining({
        id: processing.metrics_file_id,
        public_url: `https://storage.example.test/download/${processing.metrics_file_id}`,
        public_url_expires_at: downloadLinkExpiresAt,
      }),
    );
  });

  it("should return null finding a processing that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find many processes filtered by user_id with pagination and sorting", async () => {
    const owned = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );
    const otherUser = await userFactory.create();
    await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user: otherUser, dataset, processor } },
    );

    const result = await repository.findMany(
      { user_id: user.id },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(owned.id);
  });

  it("should find many processes filtered by started, finished, keep_until and created_at ranges", async () => {
    const processing = await processingFactory.create(
      {
        status: PROCESSING_STATUS.RUNNING,
        started_at: faker.date.recent(),
        finished_at: null,
        keep_until: faker.date.soon({ days: 5 }),
      },
      { associations: { user, dataset, processor } },
    );

    const oneYearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const result = await repository.findMany({
      started: true,
      finished: false,
      keep_until_start_date: new Date(0),
      keep_until_end_date: oneYearAhead,
      created_at_start_date: new Date(0),
      created_at_end_date: oneYearAhead,
    });

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: processing.id })]),
    );
  });

  it("should find many finished processes and exclude not started ones", async () => {
    const finished = await processingFactory.create(
      {
        status: PROCESSING_STATUS.SUCCEEDED,
        started_at: faker.date.recent(),
        finished_at: faker.date.recent(),
      },
      { associations: { user, dataset, processor } },
    );

    const result = await repository.findMany({
      started: true,
      finished: true,
    });

    expect(result.map(item => item.id)).toContain(finished.id);
  });

  it("should find many not started processes", async () => {
    const pending = await processingFactory.create(
      {
        status: PROCESSING_STATUS.PENDING,
        started_at: null,
        finished_at: null,
      },
      { associations: { user, dataset, processor } },
    );

    const result = await repository.findMany({ started: false });

    expect(result.map(item => item.id)).toContain(pending.id);
  });

  it("should return every matching process when no pagination is requested", async () => {
    await processingFactory.createList(
      TAKE_DEFAULT + 1,
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );

    const result = await repository.findMany({ user_id: user.id });

    expect(result).toHaveLength(TAKE_DEFAULT + 1);
  });

  it("should return a default-sized page when the pagination request omits take", async () => {
    await processingFactory.createList(
      TAKE_DEFAULT + 1,
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );

    const result = await repository.findMany({ user_id: user.id }, {});
    const publicOrPrivateResult = await repository.findManyPublicOrUserPrivate(
      { user_id: user.id },
      {},
    );

    expect(result).toHaveLength(TAKE_DEFAULT);
    expect(publicOrPrivateResult).toHaveLength(TAKE_DEFAULT);
  });

  it("should exclude archived processes by default and include them when requested", async () => {
    const processing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );

    await repository.deleteOne({ id: processing.id });

    const withoutArchived = await repository.findMany({ id: processing.id });
    expect(withoutArchived).toHaveLength(0);

    const withArchived = await repository.findMany({
      id: processing.id,
      include_archived: true,
    });
    expect(withArchived.map(item => item.id)).toContain(processing.id);
  });

  it("should find public processes and own private processes, excluding others private", async () => {
    const otherUser = await userFactory.create();

    const publicOther = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
      { associations: { user: otherUser, dataset, processor } },
    );
    const privateOwned = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );
    const privateOther = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user: otherUser, dataset, processor } },
    );

    const result = await repository.findManyPublicOrUserPrivate(
      { user_id: user.id },
      { skip: 0 },
      [{ field: "created_at", order: SORT_ORDER.DESC }],
    );

    const ids = result.map(item => item.id);

    expect(ids).toEqual(
      expect.arrayContaining([publicOther.id, privateOwned.id]),
    );
    expect(ids).not.toContain(privateOther.id);
  });

  it("should count processes by filter", async () => {
    await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );
    await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );

    const count = await repository.getCount({ user_id: user.id });

    expect(count).toBe(2);
  });

  it("should count public processes and own private processes", async () => {
    const otherUser = await userFactory.create();

    await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
      { associations: { user: otherUser, dataset, processor } },
    );
    await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );
    await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user: otherUser, dataset, processor } },
    );

    const count = await repository.getCountPublicOrUserPrivate({
      user_id: user.id,
    });

    expect(count).toBe(2);
  });

  it("should update one processing", async () => {
    const processing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );

    const updated = await repository.updateOne(
      { id: processing.id },
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
    );

    expect(updated).toMatchObject({
      id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });
  });

  it("should throw updating a processing that does not exist", async () => {
    await expect(() =>
      repository.updateOne(
        { id: faker.string.uuid() },
        { visibility: PROCESSING_VISIBILITY.PUBLIC },
      ),
    ).rejects.toThrowError("No such record.");
  });

  it("should archive one processing on delete", async () => {
    const processing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );

    const deleted = await repository.deleteOne({ id: processing.id });

    expect(deleted?.id).toBe(processing.id);

    const found = await repository.findOne({ id: processing.id });
    expect(found).toBeNull();
  });

  it("should throw deleting a processing that does not exist", async () => {
    await expect(() =>
      repository.deleteOne({ id: faker.string.uuid() }),
    ).rejects.toThrowError("No such record.");
  });

  it("should get one estimated execution time for succeeded processes", async () => {
    const finished_at = faker.date.recent();
    await processingFactory.create(
      {
        status: PROCESSING_STATUS.SUCCEEDED,
        started_at: faker.date.past({ refDate: finished_at }),
        finished_at,
      },
      { associations: { user, dataset, processor } },
    );

    const result = await repository.getOneEstimatedExecutionTime({
      dataset_id: dataset.id,
      processor_id: processor.id,
    });

    expect(result).toMatchObject({
      dataset_id: dataset.id,
      processor_id: processor.id,
    });
    expect(result?.average_execution_time_seconds).toBeDefined();
  });

  it("should return null getting one estimated execution time with invalid uuids", async () => {
    const result = await repository.getOneEstimatedExecutionTime({
      dataset_id: "not-a-uuid",
      processor_id: "not-a-uuid",
    });

    expect(result).toBeNull();
  });

  it("should return null getting one estimated execution time when there is no data", async () => {
    const result = await repository.getOneEstimatedExecutionTime({
      dataset_id: faker.string.uuid(),
      processor_id: faker.string.uuid(),
    });

    expect(result).toBeNull();
  });

  it("should get many estimated execution times filtered by dataset and processor", async () => {
    const finished_at = faker.date.recent();
    await processingFactory.create(
      {
        status: PROCESSING_STATUS.SUCCEEDED,
        started_at: faker.date.past({ refDate: finished_at }),
        finished_at,
      },
      { associations: { user, dataset, processor } },
    );

    const result = await repository.getManyEstimatedExecutionTimes({
      dataset_id: dataset.id,
      processor_id: processor.id,
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dataset_id: dataset.id,
          processor_id: processor.id,
        }),
      ]),
    );
  });

  it("should get many estimated execution times without filters", async () => {
    const finished_at = faker.date.recent();
    await processingFactory.create(
      {
        status: PROCESSING_STATUS.SUCCEEDED,
        started_at: faker.date.past({ refDate: finished_at }),
        finished_at,
      },
      { associations: { user, dataset, processor } },
    );

    const result = await repository.getManyEstimatedExecutionTimes();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
