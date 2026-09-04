import { beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Constant import
import { UserAuthProviderConnSortingOptions } from "@modules/user/constants/userSortingOptions.constant";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// DTO import
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaUserAuthProviderConnRepository } from "./prismaUserAuthProviderConn.repository";

describe("Repository: PrismaUserAuthProviderConnRepository", () => {
  const user = userFactory.build();

  const userAuthProviderConn = {
    id: faker.string.uuid(),
    auth_provider: AUTH_PROVIDER.FIREBASE,
    code: faker.string.uuid(),
    payload: {},
    disconnected_at: null,
    user_id: user.id,
  };

  const relations = { user: true };
  const defaultOrderBy = [{ created_at: "desc" }, { id: "desc" }];

  let client: {
    userAuthProviderConn: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  let prismaUserAuthProviderConnRepository: PrismaUserAuthProviderConnRepository;

  beforeEach(() => {
    client = {
      userAuthProviderConn: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };

    prismaUserAuthProviderConnRepository =
      new PrismaUserAuthProviderConnRepository({
        client,
      } as unknown as IDatabaseProvider);
  });

  it("should create a connection including the user relation", async () => {
    client.userAuthProviderConn.create.mockResolvedValueOnce(
      userAuthProviderConn,
    );

    const data = {
      auth_provider: AUTH_PROVIDER.FIREBASE,
      code: userAuthProviderConn.code,
      payload: {},
      user_id: user.id,
    };

    const result = await prismaUserAuthProviderConnRepository.createOne(data);

    expect(client.userAuthProviderConn.create).toHaveBeenCalledWith({
      data,
      include: relations,
    });
    expect(result).toEqual(
      expect.objectContaining({ id: userAuthProviderConn.id }),
    );
  });

  it("should narrow findOne to a single record hiding disconnected ones", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([
      userAuthProviderConn,
    ]);

    const result = await prismaUserAuthProviderConnRepository.findOne({
      id: userAuthProviderConn.id,
    });

    expect(client.userAuthProviderConn.findMany).toHaveBeenCalledWith({
      where: {
        id: userAuthProviderConn.id,
        user_id: undefined,
        auth_provider: undefined,
        code: undefined,
        disconnected_at: null,
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 0,
      take: 1,
    });
    expect(result).toEqual(
      expect.objectContaining({ id: userAuthProviderConn.id }),
    );
  });

  it("should return null from findOne when nothing matches", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaUserAuthProviderConnRepository.findOne({
        id: userAuthProviderConn.id,
      }),
    ).resolves.toBeNull();
  });

  it("should build the where clause from every supported filter and spread the pagination", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([]);

    await prismaUserAuthProviderConnRepository.findMany(
      {
        id: userAuthProviderConn.id,
        user_id: user.id,
        auth_provider: AUTH_PROVIDER.FIREBASE,
        code: userAuthProviderConn.code,
      },
      { skip: 3, take: 7 },
    );

    expect(client.userAuthProviderConn.findMany).toHaveBeenCalledWith({
      where: {
        id: userAuthProviderConn.id,
        user_id: user.id,
        auth_provider: AUTH_PROVIDER.FIREBASE,
        code: userAuthProviderConn.code,
        disconnected_at: null,
      },
      include: relations,
      orderBy: defaultOrderBy,
      cursor: undefined,
      skip: 3,
      take: 7,
    });
  });

  it("should drop the disconnected_at guard when disconnected records are included", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([]);

    await prismaUserAuthProviderConnRepository.findMany(
      { user_id: user.id, include_disconnected: true },
      { skip: 0, take: 10 },
    );

    expect(client.userAuthProviderConn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: undefined,
          user_id: user.id,
          auth_provider: undefined,
          code: undefined,
        },
      }),
    );
  });

  it("should forward the requested sorting merged with the common sorting", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([]);

    const sorting: ISortingDTO<typeof UserAuthProviderConnSortingOptions> = [
      { field: "updated_at", order: SORT_ORDER.ASC },
    ];

    await prismaUserAuthProviderConnRepository.findMany(
      { user_id: user.id },
      { skip: 0, take: 10 },
      sorting,
    );

    expect(client.userAuthProviderConn.findMany).toHaveBeenCalledWith(
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
    client.userAuthProviderConn.count.mockResolvedValueOnce(2);

    await expect(
      prismaUserAuthProviderConnRepository.getCount({ user_id: user.id }),
    ).resolves.toBe(2);
    expect(client.userAuthProviderConn.count).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: user.id,
        auth_provider: undefined,
        code: undefined,
        disconnected_at: null,
      },
    });
  });

  it("should update the record found by the filter", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([
      userAuthProviderConn,
    ]);
    client.userAuthProviderConn.update.mockResolvedValueOnce({
      ...userAuthProviderConn,
      code: "refreshed",
    });

    const result = await prismaUserAuthProviderConnRepository.updateOne(
      { id: userAuthProviderConn.id },
      { code: "refreshed" },
    );

    expect(client.userAuthProviderConn.update).toHaveBeenCalledWith({
      where: { id: userAuthProviderConn.id },
      data: { code: "refreshed" },
      include: relations,
    });
    expect(result).toEqual(expect.objectContaining({ code: "refreshed" }));
  });

  it("should not update when the record is absent", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaUserAuthProviderConnRepository.updateOne(
        { id: userAuthProviderConn.id },
        {},
      ),
    ).resolves.toBeNull();
    expect(client.userAuthProviderConn.update).not.toHaveBeenCalled();
  });

  it("should soft delete by stamping disconnected_at and return the previous record", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([
      userAuthProviderConn,
    ]);
    client.userAuthProviderConn.update.mockResolvedValueOnce(
      userAuthProviderConn,
    );

    const result = await prismaUserAuthProviderConnRepository.deleteOne({
      id: userAuthProviderConn.id,
    });

    expect(client.userAuthProviderConn.update).toHaveBeenCalledWith({
      where: { id: userAuthProviderConn.id },
      data: { disconnected_at: expect.any(Date) },
      include: relations,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: userAuthProviderConn.id,
        disconnected_at: null,
      }),
    );
  });

  it("should not delete when the record is absent", async () => {
    client.userAuthProviderConn.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaUserAuthProviderConnRepository.deleteOne({
        id: userAuthProviderConn.id,
      }),
    ).resolves.toBeNull();
    expect(client.userAuthProviderConn.update).not.toHaveBeenCalled();
  });
});
