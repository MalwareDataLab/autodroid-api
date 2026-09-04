import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IUserAuthProviderConnRepository } from "@shared/container/repositories";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("Repository: PrismaUserAuthProviderConnRepository", () => {
  let repository: IUserAuthProviderConnRepository;
  let user: User;

  beforeEach(async () => {
    repository = container.resolve("UserAuthProviderConnRepository");
    user = await userFactory.create();
  });

  const createConn = () =>
    repository.createOne({
      auth_provider: AUTH_PROVIDER.FIREBASE,
      code: faker.string.uuid(),
      payload: {},
      user_id: user.id,
    });

  it("should create and find one connection", async () => {
    const created = await createConn();

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.user_id).toBe(user.id);
    expect(found?.user?.id).toBe(user.id);
  });

  it("should return null finding a connection that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find one connection by user_id and auth_provider", async () => {
    const created = await createConn();

    const found = await repository.findOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });

    expect(found?.id).toBe(created.id);
  });

  it("should find many connections filtered by code with pagination and sorting", async () => {
    const created = await createConn();
    await createConn();

    const result = await repository.findMany(
      { code: created.code },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created.id);
  });

  it("should count connections by filter", async () => {
    await createConn();

    const count = await repository.getCount({ user_id: user.id });

    expect(count).toBe(1);
  });

  it("should update one connection", async () => {
    const created = await createConn();

    const updated = await repository.updateOne(
      { id: created.id },
      { code: "updated-code" },
    );

    expect(updated).toMatchObject({ id: created.id, code: "updated-code" });

    const found = await repository.findOne({ id: created.id });
    expect(found?.code).toBe("updated-code");
  });

  it("should return null updating a connection that does not exist", async () => {
    const updated = await repository.updateOne(
      { id: faker.string.uuid() },
      { code: "updated-code" },
    );

    expect(updated).toBeNull();
  });

  it("should soft delete one connection and exclude it by default", async () => {
    const created = await createConn();

    const deleted = await repository.deleteOne({ id: created.id });

    expect(deleted?.id).toBe(created.id);

    const found = await repository.findOne({ id: created.id });
    expect(found).toBeNull();

    const foundIncludingDisconnected = await repository.findOne({
      id: created.id,
      include_disconnected: true,
    });
    expect(foundIncludingDisconnected?.id).toBe(created.id);
  });

  it("should return null deleting a connection that does not exist", async () => {
    const deleted = await repository.deleteOne({ id: faker.string.uuid() });

    expect(deleted).toBeNull();
  });
});
