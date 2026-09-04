import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Util import
import { generateToken } from "@shared/utils/generateToken";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// DTO import
import { ICreateWorkerRegistrationTokenDTO } from "@modules/worker/types/IWorkerRegistrationToken.dto";

describe("Repository: PrismaWorkerRegistrationTokenRepository", () => {
  let repository: IWorkerRegistrationTokenRepository;
  let user: User;

  beforeEach(async () => {
    repository = container.resolve("WorkerRegistrationTokenRepository");
    user = await userFactory.create();
  });

  const buildCreateData = (
    overrides: Partial<ICreateWorkerRegistrationTokenDTO> = {},
  ): ICreateWorkerRegistrationTokenDTO => ({
    token: generateToken(),
    is_unlimited_usage: false,
    activated_at: null,
    expires_at: null,
    user_id: user.id,
    ...overrides,
  });

  it("should create and find one worker registration token", async () => {
    const created = await repository.createOne(buildCreateData());

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.user_id).toBe(user.id);
  });

  it("should return null finding a token that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find one token by token value", async () => {
    const created = await repository.createOne(buildCreateData());

    const found = await repository.findOne({ token: created.token });

    expect(found?.id).toBe(created.id);
  });

  it("should find many tokens filtered by user_id with pagination and sorting", async () => {
    const owned = await workerRegistrationTokenFactory.create({
      user_id: user.id,
    });
    const otherUser = await userFactory.create();
    await workerRegistrationTokenFactory.create({ user_id: otherUser.id });

    const result = await repository.findMany(
      { user_id: user.id },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(owned.id);
  });

  it("should filter tokens by is_unlimited_usage", async () => {
    const unlimited = await repository.createOne(
      buildCreateData({ is_unlimited_usage: true }),
    );

    const result = await repository.findMany({ is_unlimited_usage: true });

    expect(result.map(token => token.id)).toContain(unlimited.id);
  });

  it("should filter tokens by activated flag", async () => {
    const activated = await repository.createOne(
      buildCreateData({ activated_at: new Date() }),
    );
    const notActivated = await repository.createOne(
      buildCreateData({ activated_at: null }),
    );

    const activatedResult = await repository.findMany({ activated: true });
    const notActivatedResult = await repository.findMany({ activated: false });

    expect(activatedResult.map(token => token.id)).toContain(activated.id);
    expect(notActivatedResult.map(token => token.id)).toContain(
      notActivated.id,
    );
  });

  it("should filter tokens by archived flag", async () => {
    const archived = await workerRegistrationTokenFactory.create({
      user_id: user.id,
      archived_at: new Date(),
    });
    const active = await repository.createOne(buildCreateData());

    const archivedResult = await repository.findMany({ archived: true });
    const activeResult = await repository.findMany({ archived: false });

    expect(archivedResult.map(token => token.id)).toContain(archived.id);
    expect(activeResult.map(token => token.id)).toContain(active.id);
  });

  it("should filter tokens by expired flag", async () => {
    const expiredToken = await repository.createOne(
      buildCreateData({ expires_at: new Date(Date.now() - 60_000) }),
    );
    const validToken = await repository.createOne(
      buildCreateData({ expires_at: new Date(Date.now() + 60_000) }),
    );

    const expiredResult = await repository.findMany({ expired: true });
    const notExpiredResult = await repository.findMany({ expired: false });

    expect(expiredResult.map(token => token.id)).toContain(expiredToken.id);
    expect(notExpiredResult.map(token => token.id)).toContain(validToken.id);
  });

  it("should filter activatable and non-activatable tokens", async () => {
    const activatable = await repository.createOne(
      buildCreateData({
        expires_at: new Date(Date.now() + 60_000),
        activated_at: null,
      }),
    );
    const notActivatable = await repository.createOne(
      buildCreateData({
        expires_at: new Date(Date.now() - 60_000),
        activated_at: new Date(),
      }),
    );

    const activatableResult = await repository.findMany({ activatable: true });
    const notActivatableResult = await repository.findMany({
      activatable: false,
    });

    expect(activatableResult.map(token => token.id)).toContain(activatable.id);
    expect(notActivatableResult.map(token => token.id)).toContain(
      notActivatable.id,
    );
  });

  it("should count tokens by filter", async () => {
    await repository.createOne(buildCreateData());
    await repository.createOne(buildCreateData());

    const count = await repository.getCount({ user_id: user.id });

    expect(count).toBe(2);
  });

  it("should update one token", async () => {
    const token = await repository.createOne(buildCreateData());

    const updated = await repository.updateOne(
      { id: token.id },
      { is_unlimited_usage: true },
    );

    expect(updated).toMatchObject({
      id: token.id,
      is_unlimited_usage: true,
    });

    const found = await repository.findOne({ id: token.id });
    expect(found?.is_unlimited_usage).toBe(true);
  });

  it("should return null updating a token that does not exist", async () => {
    const updated = await repository.updateOne(
      { id: faker.string.uuid() },
      { is_unlimited_usage: true },
    );

    expect(updated).toBeNull();
  });

  it("should soft delete one token setting archived_at", async () => {
    const token = await repository.createOne(buildCreateData());

    const deleted = await repository.deleteOne({ id: token.id });

    expect(deleted?.id).toBe(token.id);
    expect(deleted?.archived_at).toBeInstanceOf(Date);
  });

  it("should return null deleting a token that does not exist", async () => {
    const deleted = await repository.deleteOne({ id: faker.string.uuid() });

    expect(deleted).toBeNull();
  });
});
