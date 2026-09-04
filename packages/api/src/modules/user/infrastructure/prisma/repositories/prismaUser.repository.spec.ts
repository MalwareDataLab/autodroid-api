import { beforeEach, describe, expect, it, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Constant import
import { UserSortingOptions } from "@modules/user/constants/userSortingOptions.constant";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Target import
import { PrismaUserRepository } from "./prismaUser.repository";

describe("Repository: PrismaUserRepository", () => {
  const user = userFactory.build();

  let client: {
    user: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  let prismaUserRepository: PrismaUserRepository;

  beforeEach(() => {
    client = {
      user: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    prismaUserRepository = new PrismaUserRepository({
      client,
    } as unknown as IDatabaseProvider);
  });

  it("should create a user with the configured relations", async () => {
    client.user.create.mockResolvedValueOnce(user);

    const result = await prismaUserRepository.createOne({
      name: user.name,
      email: user.email,
    } as any);

    expect(client.user.create).toHaveBeenCalledWith({
      data: { name: user.name, email: user.email },
      include: {},
    });
    expect(result).toEqual(expect.objectContaining({ id: user.id }));
  });

  it("should narrow findOne to a single record", async () => {
    client.user.findMany.mockResolvedValueOnce([user]);

    const result = await prismaUserRepository.findOne({ id: user.id });

    expect(client.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: user.id, email: undefined, phone_number: undefined },
        skip: 0,
        take: 1,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: user.id }));
  });

  it("should return null from findOne when nothing matches", async () => {
    client.user.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaUserRepository.findOne({ id: user.id }),
    ).resolves.toBeNull();
  });

  it("should build the where clause from every supported filter", async () => {
    client.user.findMany.mockResolvedValueOnce([]);

    await prismaUserRepository.findMany(
      { id: user.id, email: user.email, phone_number: "+5555999999999" },
      { skip: 10, take: 5 },
    );

    expect(client.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: user.id,
          email: user.email,
          phone_number: "+5555999999999",
        },
      }),
    );
  });

  it("should forward the requested sorting", async () => {
    client.user.findMany.mockResolvedValueOnce([]);

    const sorting = [
      { field: UserSortingOptions[0], order: "ASC" },
    ] as unknown as Parameters<PrismaUserRepository["findMany"]>[2];

    await prismaUserRepository.findMany(
      { id: user.id },
      { skip: 0, take: 10 },
      sorting,
    );

    expect(client.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expect.anything() }),
    );
  });

  it("should count using the same where clause", async () => {
    client.user.count.mockResolvedValueOnce(3);

    await expect(
      prismaUserRepository.getCount({ email: user.email }),
    ).resolves.toBe(3);
    expect(client.user.count).toHaveBeenCalledWith({
      where: { id: undefined, email: user.email, phone_number: undefined },
    });
  });

  it("should update the record found by the filter", async () => {
    client.user.findMany.mockResolvedValueOnce([user]);
    client.user.update.mockResolvedValueOnce({ ...user, name: "Ada" });

    const result = await prismaUserRepository.updateOne({ id: user.id }, {
      name: "Ada",
    } as any);

    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { name: "Ada" },
      include: {},
    });
    expect(result).toEqual(expect.objectContaining({ name: "Ada" }));
  });

  it("should not update when the record is absent", async () => {
    client.user.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaUserRepository.updateOne({ id: user.id }, {} as any),
    ).resolves.toBeNull();
    expect(client.user.update).not.toHaveBeenCalled();
  });

  it("should delete the record found by the filter and return it", async () => {
    client.user.findMany.mockResolvedValueOnce([user]);

    const result = await prismaUserRepository.deleteOne({ id: user.id });

    expect(client.user.delete).toHaveBeenCalledWith({
      where: { id: user.id },
      include: {},
    });
    expect(result).toEqual(expect.objectContaining({ id: user.id }));
  });

  it("should not delete when the record is absent", async () => {
    client.user.findMany.mockResolvedValueOnce([]);

    await expect(
      prismaUserRepository.deleteOne({ id: user.id }),
    ).resolves.toBeNull();
    expect(client.user.delete).not.toHaveBeenCalled();
  });
});
