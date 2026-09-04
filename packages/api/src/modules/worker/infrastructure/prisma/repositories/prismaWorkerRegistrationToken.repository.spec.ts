import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Factory import
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// DTO import
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaWorkerRegistrationTokenRepository } from "./prismaWorkerRegistrationToken.repository";

describe("Repository: PrismaWorkerRegistrationTokenRepository", () => {
  const workerRegistrationToken = workerRegistrationTokenFactory.build();

  const relations = {};
  const defaultOrderBy = [{ created_at: "desc" }, { id: "desc" }];
  const now = new Date("2024-08-01T12:00:00.000Z");

  let client: {
    workerRegistrationToken: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  let prismaWorkerRegistrationTokenRepository: PrismaWorkerRegistrationTokenRepository;

  beforeEach(() => {
    vi.useFakeTimers({ now, toFake: ["Date"] });

    client = {
      workerRegistrationToken: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };

    prismaWorkerRegistrationTokenRepository =
      new PrismaWorkerRegistrationTokenRepository({
        client,
      } as unknown as IDatabaseProvider);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a registration token with no eager relations", async () => {
    client.workerRegistrationToken.create.mockResolvedValueOnce(
      workerRegistrationToken,
    );

    const data = {
      token: workerRegistrationToken.token,
      is_unlimited_usage: false,
      user_id: workerRegistrationToken.user_id,
    };

    const result = await prismaWorkerRegistrationTokenRepository.createOne(
      data as any,
    );

    expect(client.workerRegistrationToken.create).toHaveBeenCalledWith({
      data,
      include: relations,
    });
    expect(result).toEqual(
      expect.objectContaining({ id: workerRegistrationToken.id }),
    );
  });

  it("should narrow findOne to a single record without lifecycle guards", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([
      workerRegistrationToken,
    ]);

    const result = await prismaWorkerRegistrationTokenRepository.findOne({
      id: workerRegistrationToken.id,
    });

    expect(client.workerRegistrationToken.findMany).toHaveBeenCalledWith({
      where: {
        id: workerRegistrationToken.id,
        token: undefined,
        is_unlimited_usage: undefined,
        user_id: undefined,
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: 1,
    });
    expect(result).toEqual(
      expect.objectContaining({ id: workerRegistrationToken.id }),
    );
  });

  it("should return null from findOne when nothing matches", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaWorkerRegistrationTokenRepository.findOne({
        id: workerRegistrationToken.id,
      }),
    ).resolves.toBeNull();
  });

  it("should build the positive lifecycle guards from every supported filter", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([]);

    await prismaWorkerRegistrationTokenRepository.findMany(
      {
        id: workerRegistrationToken.id,
        token: workerRegistrationToken.token,
        is_unlimited_usage: true,
        user_id: workerRegistrationToken.user_id,
        activated: true,
        archived: true,
        expired: true,
        activatable: true,
      },
      { skip: 4, take: 6 },
    );

    expect(client.workerRegistrationToken.findMany).toHaveBeenCalledWith({
      where: {
        id: workerRegistrationToken.id,
        token: workerRegistrationToken.token,
        is_unlimited_usage: true,
        user_id: workerRegistrationToken.user_id,
        activated_at: { not: null },
        archived_at: { not: null },
        expires_at: { lte: now },
        AND: {
          archived_at: null,
          expires_at: { gt: now },
          OR: [{ activated_at: null }, { is_unlimited_usage: true }],
        },
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 4,
      take: 6,
    });
  });

  it("should build the negated lifecycle guards when the flags are false", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([]);

    await prismaWorkerRegistrationTokenRepository.findMany(
      {
        activated: false,
        archived: false,
        expired: false,
        activatable: false,
      },
      { skip: 0, take: 10 },
    );

    expect(client.workerRegistrationToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: undefined,
          token: undefined,
          is_unlimited_usage: undefined,
          user_id: undefined,
          activated_at: null,
          archived_at: null,
          expires_at: { gt: now },
          AND: {
            OR: [
              { archived_at: { not: null } },
              { expires_at: { lte: now } },
              {
                AND: [
                  { activated_at: { not: null } },
                  { is_unlimited_usage: false },
                ],
              },
            ],
          },
        },
      }),
    );
  });

  it("should forward the requested sorting merged with the common sorting", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([]);

    const sorting: ISortingDTO<typeof WorkerRegistrationTokenSortingOptions> = [
      { field: "updated_at", order: SORT_ORDER.ASC },
    ];

    await prismaWorkerRegistrationTokenRepository.findMany(
      {},
      { skip: 0, take: 10 },
      sorting,
    );

    expect(client.workerRegistrationToken.findMany).toHaveBeenCalledWith(
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
    client.workerRegistrationToken.count.mockResolvedValueOnce(8);

    await expect(
      prismaWorkerRegistrationTokenRepository.getCount({
        user_id: workerRegistrationToken.user_id,
        activatable: true,
      }),
    ).resolves.toBe(8);
    expect(client.workerRegistrationToken.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        token: undefined,
        is_unlimited_usage: undefined,
        user_id: workerRegistrationToken.user_id,
        AND: {
          archived_at: null,
          expires_at: { gt: now },
          OR: [{ activated_at: null }, { is_unlimited_usage: true }],
        },
      },
    });
  });

  it("should update the record found by the filter", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([
      workerRegistrationToken,
    ]);
    client.workerRegistrationToken.update.mockResolvedValueOnce({
      ...workerRegistrationToken,
      is_unlimited_usage: true,
    });

    const result = await prismaWorkerRegistrationTokenRepository.updateOne(
      { id: workerRegistrationToken.id },
      { is_unlimited_usage: true },
    );

    expect(client.workerRegistrationToken.update).toHaveBeenCalledWith({
      where: { id: workerRegistrationToken.id },
      data: { is_unlimited_usage: true },
      include: relations,
    });
    expect(result).toEqual(
      expect.objectContaining({ is_unlimited_usage: true }),
    );
  });

  it("should not update when the record is absent", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaWorkerRegistrationTokenRepository.updateOne(
        { id: workerRegistrationToken.id },
        {},
      ),
    ).resolves.toBeNull();
    expect(client.workerRegistrationToken.update).not.toHaveBeenCalled();
  });

  it("should soft delete by stamping archived_at", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([
      workerRegistrationToken,
    ]);
    client.workerRegistrationToken.update.mockResolvedValueOnce({
      ...workerRegistrationToken,
      archived_at: now,
    });

    const result = await prismaWorkerRegistrationTokenRepository.deleteOne({
      id: workerRegistrationToken.id,
    });

    expect(client.workerRegistrationToken.update).toHaveBeenCalledWith({
      where: { id: workerRegistrationToken.id },
      data: { archived_at: now },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ archived_at: now }));
  });

  it("should not delete when the record is absent", async () => {
    client.workerRegistrationToken.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaWorkerRegistrationTokenRepository.deleteOne({
        id: workerRegistrationToken.id,
      }),
    ).resolves.toBeNull();
    expect(client.workerRegistrationToken.update).not.toHaveBeenCalled();
  });
});
