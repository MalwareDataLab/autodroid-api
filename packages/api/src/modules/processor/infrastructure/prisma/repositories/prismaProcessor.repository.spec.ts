import { beforeEach, describe, expect, it, vi } from "vitest";

// Factory import
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// DTO import
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaProcessorRepository } from "./prismaProcessor.repository";

describe("Repository: PrismaProcessorRepository", () => {
  const processor = processorFactory.build();

  const relations = { user: true };
  const defaultOrderBy = [{ created_at: "desc" }, { id: "desc" }];

  let client: {
    processor: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  let prismaProcessorRepository: PrismaProcessorRepository;

  beforeEach(() => {
    client = {
      processor: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    prismaProcessorRepository = new PrismaProcessorRepository({
      client,
    } as unknown as IDatabaseProvider);
  });

  it("should create a processor including the user relation", async () => {
    client.processor.create.mockResolvedValueOnce(processor);

    const data = {
      name: processor.name,
      version: processor.version,
      image_tag: processor.image_tag,
      user_id: processor.user_id,
    };

    const result = await prismaProcessorRepository.createOne(data as any);

    expect(client.processor.create).toHaveBeenCalledWith({
      data,
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ id: processor.id }));
  });

  it("should narrow findOne to the first record", async () => {
    client.processor.findMany.mockResolvedValueOnce([processor]);

    const result = await prismaProcessorRepository.findOne({
      id: processor.id,
    });

    expect(client.processor.findMany).toHaveBeenCalledWith({
      where: {
        id: processor.id,
        user_id: undefined,
        visibility: undefined,
        image_tag: undefined,
        name: undefined,
        version: undefined,
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: undefined,
    });
    expect(result).toEqual(expect.objectContaining({ id: processor.id }));
  });

  it("should return null from findOne when nothing matches", async () => {
    client.processor.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaProcessorRepository.findOne({ id: processor.id }),
    ).resolves.toBeNull();
  });

  it("should build the where clause from every supported filter and spread the pagination", async () => {
    client.processor.findMany.mockResolvedValueOnce([]);

    await prismaProcessorRepository.findMany(
      {
        id: processor.id,
        user_id: processor.user_id,
        visibility: PROCESSOR_VISIBILITY.PUBLIC,
        image_tag: processor.image_tag,
        name: processor.name,
        version: processor.version,
      },
      { skip: 5, take: 25 },
    );

    expect(client.processor.findMany).toHaveBeenCalledWith({
      where: {
        id: processor.id,
        user_id: processor.user_id,
        visibility: PROCESSOR_VISIBILITY.PUBLIC,
        image_tag: processor.image_tag,
        name: processor.name,
        version: processor.version,
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 5,
      take: 25,
    });
  });

  it("should forward the requested sorting merged with the common sorting", async () => {
    client.processor.findMany.mockResolvedValueOnce([]);

    const sorting: ISortingDTO<typeof ProcessorSortingOptions> = [
      { field: "updated_at", order: SORT_ORDER.ASC },
    ];

    await prismaProcessorRepository.findMany(
      {},
      { skip: 0, take: 10 },
      sorting,
    );

    expect(client.processor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { updated_at: "asc" },
          { created_at: "desc" },
          { id: "desc" },
        ],
      }),
    );
  });

  it("should restrict findManyPublicOrUserPrivate to public processors or the user own hidden ones", async () => {
    client.processor.findMany.mockResolvedValueOnce([]);

    await prismaProcessorRepository.findManyPublicOrUserPrivate({
      user_id: processor.user_id,
      name: processor.name,
    });

    expect(client.processor.findMany).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: undefined,
        visibility: undefined,
        image_tag: undefined,
        name: processor.name,
        version: undefined,
        AND: {
          OR: [
            { visibility: PROCESSOR_VISIBILITY.PUBLIC },
            {
              visibility: PROCESSOR_VISIBILITY.HIDDEN,
              user_id: processor.user_id,
            },
          ],
        },
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: undefined,
    });
  });

  it("should flatten the comma separated allowed mime types of every processor", async () => {
    client.processor.findMany.mockResolvedValueOnce([
      { allowed_mime_types: "image/png,text/csv" },
      { allowed_mime_types: "application/zip" },
    ]);

    await expect(
      prismaProcessorRepository.getAllowedMimeTypes(),
    ).resolves.toEqual(["image/png", "text/csv", "application/zip"]);
    expect(client.processor.findMany).toHaveBeenCalledWith({
      select: { allowed_mime_types: true },
    });
  });

  it("should count using the same where clause", async () => {
    client.processor.count.mockResolvedValueOnce(6);

    await expect(
      prismaProcessorRepository.getCount({ user_id: processor.user_id }),
    ).resolves.toBe(6);
    expect(client.processor.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: processor.user_id,
        visibility: undefined,
        image_tag: undefined,
        name: undefined,
        version: undefined,
      },
    });
  });

  it("should count public or user hidden processors with the visibility disjunction", async () => {
    client.processor.count.mockResolvedValueOnce(3);

    await expect(
      prismaProcessorRepository.getCountPublicOrUserPrivate({
        user_id: processor.user_id,
        version: processor.version,
      }),
    ).resolves.toBe(3);
    expect(client.processor.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: undefined,
        visibility: undefined,
        image_tag: undefined,
        name: undefined,
        version: processor.version,
        AND: {
          OR: [
            { visibility: PROCESSOR_VISIBILITY.PUBLIC },
            {
              visibility: PROCESSOR_VISIBILITY.HIDDEN,
              user_id: processor.user_id,
            },
          ],
        },
      },
    });
  });

  it("should update the record found by the filter", async () => {
    client.processor.findMany.mockResolvedValueOnce([processor]);
    client.processor.update.mockResolvedValueOnce({
      ...processor,
      description: "updated",
    });

    const result = await prismaProcessorRepository.updateOne(
      { id: processor.id },
      { description: "updated" },
    );

    expect(client.processor.update).toHaveBeenCalledWith({
      where: { id: processor.id },
      data: { description: "updated" },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ description: "updated" }));
  });

  it("should not update when the record is absent", async () => {
    client.processor.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaProcessorRepository.updateOne({ id: processor.id }, {}),
    ).resolves.toBeNull();
    expect(client.processor.update).not.toHaveBeenCalled();
  });

  it("should delete the record found by the filter and return the deleted row", async () => {
    client.processor.findMany.mockResolvedValueOnce([processor]);
    client.processor.delete.mockResolvedValueOnce(processor);

    const result = await prismaProcessorRepository.deleteOne({
      id: processor.id,
    });

    expect(client.processor.delete).toHaveBeenCalledWith({
      where: { id: processor.id },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ id: processor.id }));
  });

  it("should not delete when the record is absent", async () => {
    client.processor.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaProcessorRepository.deleteOne({ id: processor.id }),
    ).resolves.toBeNull();
    expect(client.processor.delete).not.toHaveBeenCalled();
  });
});
