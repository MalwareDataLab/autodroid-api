import { beforeEach, describe, expect, it, vi } from "vitest";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// DTO import
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaDatasetRepository } from "./prismaDataset.repository";

describe("Repository: PrismaDatasetRepository", () => {
  const dataset = datasetFactory.build();

  const relations = { user: true, file: true };
  const defaultOrderBy = [{ created_at: "desc" }, { id: "desc" }];

  let client: {
    dataset: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  let prismaDatasetRepository: PrismaDatasetRepository;

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(File, "processAnyNested").mockImplementation(
      async ({ data }: any) => data,
    );

    client = {
      dataset: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    prismaDatasetRepository = new PrismaDatasetRepository({
      client,
    } as unknown as IDatabaseProvider);
  });

  it("should create a dataset including the user and file relations", async () => {
    client.dataset.create.mockResolvedValueOnce(dataset);

    const data = {
      description: dataset.description,
      tags: dataset.tags,
      visibility: dataset.visibility,
      user_id: dataset.user_id,
      file_id: dataset.file_id,
    };

    const result = await prismaDatasetRepository.createOne(data as any);

    expect(client.dataset.create).toHaveBeenCalledWith({
      data,
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ id: dataset.id }));
  });

  it("should narrow findOne to the first record without pagination limits", async () => {
    client.dataset.findMany.mockResolvedValueOnce([dataset]);

    const result = await prismaDatasetRepository.findOne({ id: dataset.id });

    expect(client.dataset.findMany).toHaveBeenCalledWith({
      where: {
        id: dataset.id,
        user_id: undefined,
        file_id: undefined,
        visibility: undefined,
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: undefined,
    });
    expect(result).toEqual(expect.objectContaining({ id: dataset.id }));
  });

  it("should return null from findOne when nothing matches", async () => {
    client.dataset.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaDatasetRepository.findOne({ id: dataset.id }),
    ).resolves.toBeNull();
  });

  it("should build the where clause from every supported filter and spread the pagination", async () => {
    client.dataset.findMany.mockResolvedValueOnce([]);

    await prismaDatasetRepository.findMany(
      {
        id: dataset.id,
        user_id: dataset.user_id,
        file_id: dataset.file_id,
        visibility: DATASET_VISIBILITY.PUBLIC,
      },
      { skip: 10, take: 5 },
    );

    expect(client.dataset.findMany).toHaveBeenCalledWith({
      where: {
        id: dataset.id,
        user_id: dataset.user_id,
        file_id: dataset.file_id,
        visibility: DATASET_VISIBILITY.PUBLIC,
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 10,
      take: 5,
    });
  });

  it("should forward the requested sorting merged with the common sorting", async () => {
    client.dataset.findMany.mockResolvedValueOnce([]);

    const sorting: ISortingDTO<typeof DatasetSortingOptions> = [
      { field: "updated_at", order: SORT_ORDER.ASC },
    ];

    await prismaDatasetRepository.findMany({}, { skip: 0, take: 10 }, sorting);

    expect(client.dataset.findMany).toHaveBeenCalledWith(
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
    client.dataset.findMany.mockResolvedValueOnce([dataset]);

    const result = await prismaDatasetRepository.findMany({}, { skip: 0 });

    expect(File.processAnyNested).toHaveBeenCalledWith({
      cls: expect.any(Function),
      data: [expect.objectContaining({ id: dataset.id })],
    });
    expect(result).toEqual([expect.objectContaining({ id: dataset.id })]);
  });

  it("should restrict findManyPublicOrUserPrivate to public datasets or the user own private ones", async () => {
    client.dataset.findMany.mockResolvedValueOnce([]);

    await prismaDatasetRepository.findManyPublicOrUserPrivate(
      { user_id: dataset.user_id, file_id: dataset.file_id },
      { skip: 0, take: 20 },
    );

    expect(client.dataset.findMany).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: undefined,
        file_id: dataset.file_id,
        visibility: undefined,
        AND: {
          OR: [
            { visibility: DATASET_VISIBILITY.PUBLIC },
            {
              visibility: DATASET_VISIBILITY.PRIVATE,
              user_id: dataset.user_id,
            },
          ],
        },
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: 20,
    });
  });

  it("should count using the same where clause", async () => {
    client.dataset.count.mockResolvedValueOnce(4);

    await expect(
      prismaDatasetRepository.getCount({ user_id: dataset.user_id }),
    ).resolves.toBe(4);
    expect(client.dataset.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: dataset.user_id,
        file_id: undefined,
        visibility: undefined,
      },
    });
  });

  it("should count public or user private datasets with the visibility disjunction", async () => {
    client.dataset.count.mockResolvedValueOnce(7);

    await expect(
      prismaDatasetRepository.getCountPublicOrUserPrivate({
        user_id: dataset.user_id,
        visibility: DATASET_VISIBILITY.PUBLIC,
      }),
    ).resolves.toBe(7);
    expect(client.dataset.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: undefined,
        file_id: undefined,
        visibility: DATASET_VISIBILITY.PUBLIC,
        AND: {
          OR: [
            { visibility: DATASET_VISIBILITY.PUBLIC },
            {
              visibility: DATASET_VISIBILITY.PRIVATE,
              user_id: dataset.user_id,
            },
          ],
        },
      },
    });
  });

  it("should update the record found by the filter", async () => {
    client.dataset.findMany.mockResolvedValueOnce([dataset]);
    client.dataset.update.mockResolvedValueOnce({
      ...dataset,
      description: "updated",
    });

    const result = await prismaDatasetRepository.updateOne(
      { id: dataset.id },
      { description: "updated" },
    );

    expect(client.dataset.update).toHaveBeenCalledWith({
      where: { id: dataset.id },
      data: { description: "updated" },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ description: "updated" }));
  });

  it("should not update when the record is absent", async () => {
    client.dataset.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaDatasetRepository.updateOne({ id: dataset.id }, {}),
    ).resolves.toBeNull();
    expect(client.dataset.update).not.toHaveBeenCalled();
  });

  it("should delete the record found by the filter and return the deleted row", async () => {
    client.dataset.findMany.mockResolvedValueOnce([dataset]);
    client.dataset.delete.mockResolvedValueOnce(dataset);

    const result = await prismaDatasetRepository.deleteOne({ id: dataset.id });

    expect(client.dataset.delete).toHaveBeenCalledWith({
      where: { id: dataset.id },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ id: dataset.id }));
  });

  it("should not delete when the record is absent", async () => {
    client.dataset.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaDatasetRepository.deleteOne({ id: dataset.id }),
    ).resolves.toBeNull();
    expect(client.dataset.delete).not.toHaveBeenCalled();
  });
});
