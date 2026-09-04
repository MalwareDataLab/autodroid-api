import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Repository import
import { IUserRepository } from "@shared/container/repositories";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

describe("Repository: PrismaUserRepository", () => {
  let repository: IUserRepository;

  beforeEach(() => {
    repository = container.resolve("UserRepository");
  });

  it("should create and find one user", async () => {
    const email = faker.internet.email();

    const created = await repository.createOne({
      email,
      name: faker.person.firstName(),
      phone_number: faker.phone.number(),
      learning_data: {},
      language: "en",
      notifications_enabled: true,
    });

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe(email);
  });

  it("should return null finding a user that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find one user by email", async () => {
    const user = await userFactory.create();

    const found = await repository.findOne({ email: user.email });

    expect(found?.id).toBe(user.id);
  });

  it("should find many users filtered by id with pagination and sorting", async () => {
    const user = await userFactory.create();
    await userFactory.create();

    const result = await repository.findMany(
      { id: user.id },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(user.id);
  });

  it("should count users by filter", async () => {
    const user = await userFactory.create();

    const count = await repository.getCount({ id: user.id });

    expect(count).toBe(1);
  });

  it("should update one user", async () => {
    const user = await userFactory.create();

    const updated = await repository.updateOne(
      { id: user.id },
      { name: "Updated", language: "pt-BR" },
    );

    expect(updated).toMatchObject({
      id: user.id,
      name: "Updated",
      language: "pt-BR",
    });

    const found = await repository.findOne({ id: user.id });
    expect(found?.name).toBe("Updated");
  });

  it("should return null updating a user that does not exist", async () => {
    const updated = await repository.updateOne(
      { id: faker.string.uuid() },
      { name: "Updated" },
    );

    expect(updated).toBeNull();
  });

  it("should delete one user", async () => {
    const user = await userFactory.create();

    const deleted = await repository.deleteOne({ id: user.id });

    expect(deleted?.id).toBe(user.id);

    const found = await repository.findOne({ id: user.id });
    expect(found).toBeNull();
  });

  it("should return null deleting a user that does not exist", async () => {
    const deleted = await repository.deleteOne({ id: faker.string.uuid() });

    expect(deleted).toBeNull();
  });
});
