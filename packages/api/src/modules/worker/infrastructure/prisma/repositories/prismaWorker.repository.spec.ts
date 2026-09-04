import { beforeEach, describe, expect, it, vi } from "vitest";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Constant import
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// DTO import
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaWorkerRepository } from "./prismaWorker.repository";

describe("Repository: PrismaWorkerRepository", () => {
  const worker = workerFactory.build();

  const relations = { registration_token: true, user: true };
  const defaultOrderBy = [{ created_at: "desc" }, { id: "desc" }];

  const lastSeenAtStartDate = new Date("2024-06-01T00:00:00.000Z");
  const lastSeenAtEndDate = new Date("2024-07-01T00:00:00.000Z");

  let client: {
    worker: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  let prismaWorkerRepository: PrismaWorkerRepository;

  beforeEach(() => {
    client = {
      worker: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };

    prismaWorkerRepository = new PrismaWorkerRepository({
      client,
    } as unknown as IDatabaseProvider);
  });

  it("should create a worker including the registration token and user relations", async () => {
    client.worker.create.mockResolvedValueOnce(worker);

    const data = {
      name: worker.name,
      internal_id: worker.internal_id,
      signature: worker.signature,
      user_id: worker.user_id,
      registration_token_id: worker.registration_token_id,
    };

    const result = await prismaWorkerRepository.createOne(data as any);

    expect(client.worker.create).toHaveBeenCalledWith({
      data,
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ id: worker.id }));
  });

  it("should narrow findOne to a single record without the archived guard", async () => {
    client.worker.findMany.mockResolvedValueOnce([worker]);

    const result = await prismaWorkerRepository.findOne({ id: worker.id });

    expect(client.worker.findMany).toHaveBeenCalledWith({
      where: {
        id: worker.id,
        refresh_token: undefined,
        user_id: undefined,
        registration_token_id: undefined,
        internal_id: undefined,
        signature: undefined,
        missing: undefined,
        registration_token: { token: undefined },
        AND: [],
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: 1,
    });
    expect(result).toEqual(expect.objectContaining({ id: worker.id }));
  });

  it("should return null from findOne when nothing matches", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaWorkerRepository.findOne({ id: worker.id }),
    ).resolves.toBeNull();
  });

  it("should build the where clause from every supported filter and spread the pagination", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    await prismaWorkerRepository.findMany(
      {
        id: worker.id,
        refresh_token: worker.refresh_token,
        user_id: worker.user_id,
        registration_token: "registration-token",
        registration_token_id: worker.registration_token_id,
        internal_id: worker.internal_id,
        signature: worker.signature,
        missing: false,
        archived: true,
        last_seen_at_start_date: lastSeenAtStartDate,
        last_seen_at_end_date: lastSeenAtEndDate,
      },
      { skip: 2, take: 8 },
    );

    expect(client.worker.findMany).toHaveBeenCalledWith({
      where: {
        id: worker.id,
        refresh_token: worker.refresh_token,
        user_id: worker.user_id,
        registration_token_id: worker.registration_token_id,
        internal_id: worker.internal_id,
        signature: worker.signature,
        missing: false,
        archived_at: { not: null },
        registration_token: { token: "registration-token" },
        AND: [
          { last_seen_at: { not: null, gte: lastSeenAtStartDate } },
          { last_seen_at: { not: null, lte: lastSeenAtEndDate } },
        ],
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 2,
      take: 8,
    });
  });

  it("should require a null archived_at when archived is false", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    await prismaWorkerRepository.findMany({ archived: false }, { skip: 0 });

    expect(client.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archived_at: null }),
      }),
    );
  });

  it("should push only the lower bound when just the last seen start date is supplied", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    await prismaWorkerRepository.findMany(
      { last_seen_at_start_date: lastSeenAtStartDate },
      { skip: 0 },
    );

    expect(client.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ last_seen_at: { not: null, gte: lastSeenAtStartDate } }],
        }),
      }),
    );
  });

  it("should push only the upper bound when just the last seen end date is supplied", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    await prismaWorkerRepository.findMany(
      { last_seen_at_end_date: lastSeenAtEndDate },
      { skip: 0 },
    );

    expect(client.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ last_seen_at: { not: null, lte: lastSeenAtEndDate } }],
        }),
      }),
    );
  });

  it("should forward the requested sorting merged with the common sorting", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    const sorting: ISortingDTO<typeof WorkerSortingOptions> = [
      { field: "updated_at", order: SORT_ORDER.ASC },
    ];

    await prismaWorkerRepository.findMany({}, { skip: 0, take: 10 }, sorting);

    expect(client.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { updated_at: "asc" },
          { created_at: "desc" },
          { id: "desc" },
        ],
      }),
    );
  });

  it("should count using the same where clause", async () => {
    client.worker.count.mockResolvedValueOnce(5);

    await expect(
      prismaWorkerRepository.getCount({ user_id: worker.user_id }),
    ).resolves.toBe(5);
    expect(client.worker.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        refresh_token: undefined,
        user_id: worker.user_id,
        registration_token_id: undefined,
        internal_id: undefined,
        signature: undefined,
        missing: undefined,
        registration_token: { token: undefined },
        AND: [],
      },
    });
  });

  it("should update the record found by the filter", async () => {
    client.worker.findMany.mockResolvedValueOnce([worker]);
    client.worker.update.mockResolvedValueOnce({ ...worker, missing: true });

    const result = await prismaWorkerRepository.updateOne(
      { id: worker.id },
      { missing: true },
    );

    expect(client.worker.update).toHaveBeenCalledWith({
      where: { id: worker.id },
      data: { missing: true },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ missing: true }));
  });

  it("should not update when the record is absent", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaWorkerRepository.updateOne({ id: worker.id }, {}),
    ).resolves.toBeNull();
    expect(client.worker.update).not.toHaveBeenCalled();
  });

  it("should soft delete by stamping archived_at", async () => {
    client.worker.findMany.mockResolvedValueOnce([worker]);
    client.worker.update.mockResolvedValueOnce({
      ...worker,
      archived_at: new Date(),
    });

    const result = await prismaWorkerRepository.deleteOne({ id: worker.id });

    expect(client.worker.update).toHaveBeenCalledWith({
      where: { id: worker.id },
      data: { archived_at: expect.any(Date) },
      include: relations,
    });
    expect(result).toEqual(
      expect.objectContaining({ archived_at: expect.any(Date) }),
    );
  });

  it("should not delete when the record is absent", async () => {
    client.worker.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaWorkerRepository.deleteOne({ id: worker.id }),
    ).resolves.toBeNull();
    expect(client.worker.update).not.toHaveBeenCalled();
  });
});
