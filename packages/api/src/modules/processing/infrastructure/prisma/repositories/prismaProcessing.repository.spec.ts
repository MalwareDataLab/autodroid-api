import { beforeEach, describe, expect, it, vi } from "vitest";

// Factory import
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// DTO import
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaProcessingRepository } from "./prismaProcessing.repository";

describe("Repository: PrismaProcessingRepository", () => {
  const processing = processingFactory.build();

  const relations = {
    user: true,
    dataset: { include: { file: true, user: true } },
    processor: true,
    result_file: true,
    metrics_file: true,
    worker: true,
  };
  const defaultOrderBy = [{ created_at: "desc" }, { id: "desc" }];

  const keepUntilStartDate = new Date("2024-02-01T00:00:00.000Z");
  const keepUntilEndDate = new Date("2024-03-01T00:00:00.000Z");
  const createdAtStartDate = new Date("2024-04-01T00:00:00.000Z");
  const createdAtEndDate = new Date("2024-05-01T00:00:00.000Z");

  let client: {
    processing: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  let prismaProcessingRepository: PrismaProcessingRepository;

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(File, "processAnyNested").mockImplementation(
      async ({ data }: any) => data,
    );

    client = {
      processing: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      $queryRaw: vi.fn(),
    };

    prismaProcessingRepository = new PrismaProcessingRepository({
      client,
    } as unknown as IDatabaseProvider);
  });

  it("should create a processing including every configured relation", async () => {
    client.processing.create.mockResolvedValueOnce(processing);

    const data = {
      status: PROCESSING_STATUS.PENDING,
      visibility: PROCESSING_VISIBILITY.PRIVATE,
      user_id: processing.user_id,
      processor_id: processing.processor_id,
      dataset_id: processing.dataset_id,
    };

    const result = await prismaProcessingRepository.createOne(data as any);

    expect(client.processing.create).toHaveBeenCalledWith({
      data,
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ id: processing.id }));
  });

  it("should exclude archived records by default on findOne", async () => {
    client.processing.findMany.mockResolvedValueOnce([processing]);

    const result = await prismaProcessingRepository.findOne({
      id: processing.id,
    });

    expect(client.processing.findMany).toHaveBeenCalledWith({
      where: {
        id: processing.id,
        status: undefined,
        visibility: undefined,
        user_id: undefined,
        processor_id: undefined,
        dataset_id: undefined,
        worker_id: undefined,
        result_file_id: undefined,
        metrics_file_id: undefined,
        AND: [{ archived_at: null }],
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: undefined,
    });
    expect(result).toEqual(expect.objectContaining({ id: processing.id }));
  });

  it("should return null from findOne when nothing matches", async () => {
    client.processing.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaProcessingRepository.findOne({ id: processing.id }),
    ).resolves.toBeNull();
  });

  it("should build the where clause from every supported filter and spread the pagination", async () => {
    client.processing.findMany.mockResolvedValueOnce([]);

    await prismaProcessingRepository.findMany(
      {
        id: processing.id,
        status: PROCESSING_STATUS.SUCCEEDED,
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        user_id: processing.user_id,
        processor_id: processing.processor_id,
        dataset_id: processing.dataset_id,
        worker_id: "worker-id",
        result_file_id: "result-file-id",
        metrics_file_id: "metrics-file-id",
        started: true,
        finished: true,
        keep_until_start_date: keepUntilStartDate,
        keep_until_end_date: keepUntilEndDate,
        created_at_start_date: createdAtStartDate,
        created_at_end_date: createdAtEndDate,
        include_archived: true,
      },
      { skip: 20, take: 10 },
    );

    expect(client.processing.findMany).toHaveBeenCalledWith({
      where: {
        id: processing.id,
        status: PROCESSING_STATUS.SUCCEEDED,
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        user_id: processing.user_id,
        processor_id: processing.processor_id,
        dataset_id: processing.dataset_id,
        worker_id: "worker-id",
        result_file_id: "result-file-id",
        metrics_file_id: "metrics-file-id",
        AND: [
          { started_at: { not: null } },
          { finished_at: { not: null } },
          { keep_until: { not: null, gte: keepUntilStartDate } },
          { keep_until: { not: null, lte: keepUntilEndDate } },
          { created_at: { gte: createdAtStartDate } },
          { created_at: { lte: createdAtEndDate } },
        ],
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 20,
      take: 10,
    });
  });

  it("should invert the started and finished conditions when they are false", async () => {
    client.processing.findMany.mockResolvedValueOnce([]);

    await prismaProcessingRepository.findMany(
      { started: false, finished: false },
      { skip: 0 },
    );

    expect(client.processing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            { archived_at: null },
            { started_at: null },
            { finished_at: null },
          ],
        }),
      }),
    );
  });

  it("should forward the requested sorting merged with the common sorting", async () => {
    client.processing.findMany.mockResolvedValueOnce([]);

    const sorting: ISortingDTO<typeof ProcessingSortingOptions> = [
      { field: "updated_at", order: SORT_ORDER.ASC },
    ];

    await prismaProcessingRepository.findMany(
      {},
      { skip: 0, take: 10 },
      sorting,
    );

    expect(client.processing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { updated_at: "asc" },
          { created_at: "desc" },
          { id: "desc" },
        ],
      }),
    );
  });

  it("should run the nested file processing over the findMany result", async () => {
    client.processing.findMany.mockResolvedValueOnce([processing]);

    const result = await prismaProcessingRepository.findMany({}, { skip: 0 });

    expect(File.processAnyNested).toHaveBeenCalledWith({
      cls: Processing,
      data: [expect.objectContaining({ id: processing.id })],
    });
    expect(result).toEqual([expect.objectContaining({ id: processing.id })]);
  });

  it("should append the visibility disjunction to the existing conditions on findManyPublicOrUserPrivate", async () => {
    client.processing.findMany.mockResolvedValueOnce([]);

    await prismaProcessingRepository.findManyPublicOrUserPrivate(
      { user_id: processing.user_id, started: true },
      { skip: 0, take: 15 },
    );

    expect(client.processing.findMany).toHaveBeenCalledWith({
      where: {
        id: undefined,
        status: undefined,
        visibility: undefined,
        user_id: undefined,
        processor_id: undefined,
        dataset_id: undefined,
        worker_id: undefined,
        result_file_id: undefined,
        metrics_file_id: undefined,
        AND: [
          { archived_at: null },
          { started_at: { not: null } },
          {
            OR: [
              { visibility: PROCESSING_VISIBILITY.PUBLIC },
              {
                visibility: PROCESSING_VISIBILITY.PRIVATE,
                user_id: processing.user_id,
              },
            ],
          },
        ],
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: 15,
    });
  });

  it("should count using the same where clause", async () => {
    client.processing.count.mockResolvedValueOnce(9);

    await expect(
      prismaProcessingRepository.getCount({ user_id: processing.user_id }),
    ).resolves.toBe(9);
    expect(client.processing.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        status: undefined,
        visibility: undefined,
        user_id: processing.user_id,
        processor_id: undefined,
        dataset_id: undefined,
        worker_id: undefined,
        result_file_id: undefined,
        metrics_file_id: undefined,
        AND: [{ archived_at: null }],
      },
    });
  });

  it("should count public or user private processes with the visibility disjunction", async () => {
    client.processing.count.mockResolvedValueOnce(2);

    await expect(
      prismaProcessingRepository.getCountPublicOrUserPrivate({
        user_id: processing.user_id,
      }),
    ).resolves.toBe(2);
    expect(client.processing.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: [
          { archived_at: null },
          {
            OR: [
              { visibility: PROCESSING_VISIBILITY.PUBLIC },
              {
                visibility: PROCESSING_VISIBILITY.PRIVATE,
                user_id: processing.user_id,
              },
            ],
          },
        ],
      }),
    });
  });

  it("should update the record found by the filter", async () => {
    client.processing.findMany.mockResolvedValueOnce([processing]);
    client.processing.update.mockResolvedValueOnce({
      ...processing,
      status: PROCESSING_STATUS.RUNNING,
    });

    const result = await prismaProcessingRepository.updateOne(
      { id: processing.id },
      { status: PROCESSING_STATUS.RUNNING },
    );

    expect(client.processing.update).toHaveBeenCalledWith({
      where: { id: processing.id },
      data: { status: PROCESSING_STATUS.RUNNING },
      include: relations,
    });
    expect(result).toEqual(
      expect.objectContaining({ status: PROCESSING_STATUS.RUNNING }),
    );
  });

  it("should throw instead of updating when the record is absent", async () => {
    client.processing.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaProcessingRepository.updateOne({ id: processing.id }, {}),
    ).rejects.toThrow("No such record.");
    expect(client.processing.update).not.toHaveBeenCalled();
  });

  it("should soft delete by stamping archived_at", async () => {
    client.processing.findMany.mockResolvedValueOnce([processing]);
    client.processing.update.mockResolvedValueOnce(processing);

    const result = await prismaProcessingRepository.deleteOne({
      id: processing.id,
    });

    expect(client.processing.update).toHaveBeenCalledWith({
      where: { id: processing.id },
      data: { archived_at: expect.any(Date) },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ id: processing.id }));
  });

  it("should throw instead of deleting when the record is absent", async () => {
    client.processing.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaProcessingRepository.deleteOne({ id: processing.id }),
    ).rejects.toThrow("No such record.");
    expect(client.processing.update).not.toHaveBeenCalled();
  });

  it("should return null from getOneEstimatedExecutionTime when the ids are not valid uuids", async () => {
    await expect(
      prismaProcessingRepository.getOneEstimatedExecutionTime({
        processor_id: "not-a-uuid",
        dataset_id: processing.dataset_id,
      }),
    ).resolves.toBeNull();

    await expect(
      prismaProcessingRepository.getOneEstimatedExecutionTime({
        processor_id: processing.processor_id,
        dataset_id: "not-a-uuid",
      }),
    ).resolves.toBeNull();

    expect(client.$queryRaw).not.toHaveBeenCalled();
  });

  it("should bind both ids into the estimated execution time query", async () => {
    const row = {
      processor_id: processing.processor_id,
      dataset_id: processing.dataset_id,
      average_execution_time_seconds: 42,
    };
    client.$queryRaw.mockResolvedValueOnce([row]);

    await expect(
      prismaProcessingRepository.getOneEstimatedExecutionTime({
        processor_id: processing.processor_id,
        dataset_id: processing.dataset_id,
      }),
    ).resolves.toEqual(row);

    const [, boundDatasetId, boundProcessorId] = client.$queryRaw.mock.calls[0];
    expect(boundDatasetId).toBe(processing.dataset_id);
    expect(boundProcessorId).toBe(processing.processor_id);
  });

  it("should return null from getOneEstimatedExecutionTime when the query yields no row", async () => {
    client.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      prismaProcessingRepository.getOneEstimatedExecutionTime({
        processor_id: processing.processor_id,
        dataset_id: processing.dataset_id,
      }),
    ).resolves.toBeNull();
  });

  it("should query every estimated execution time without conditions when no filter is given", async () => {
    client.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      prismaProcessingRepository.getManyEstimatedExecutionTimes(),
    ).resolves.toEqual([]);

    const [, datasetCondition, processorCondition] =
      client.$queryRaw.mock.calls[0];
    expect(datasetCondition.values).toEqual([]);
    expect(processorCondition.values).toEqual([]);
  });

  it("should bind the supplied filter into the estimated execution times query", async () => {
    const rows = [
      {
        processor_id: processing.processor_id,
        dataset_id: processing.dataset_id,
        average_execution_time_seconds: 10,
      },
    ];
    client.$queryRaw.mockResolvedValueOnce(rows);

    await expect(
      prismaProcessingRepository.getManyEstimatedExecutionTimes({
        dataset_id: processing.dataset_id,
        processor_id: processing.processor_id,
      }),
    ).resolves.toEqual(rows);

    const [, datasetCondition, processorCondition] =
      client.$queryRaw.mock.calls[0];
    expect(datasetCondition.values).toEqual([processing.dataset_id]);
    expect(processorCondition.values).toEqual([processing.processor_id]);
  });
});
