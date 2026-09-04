import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";
import { createHash } from "node:crypto";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// DTO import
import { ICreateWorkerDTO } from "@modules/worker/types/IWorker.dto";

const sha256 = () =>
  createHash("sha256").update(faker.string.alphanumeric(16)).digest("hex");

describe("Repository: PrismaWorkerRepository", () => {
  let repository: IWorkerRepository;
  let user: User;
  let registrationToken: WorkerRegistrationToken;

  beforeEach(async () => {
    repository = container.resolve("WorkerRepository");
    user = await userFactory.create();
    registrationToken = await workerRegistrationTokenFactory.create({
      user_id: user.id,
    });
  });

  const buildCreateData = (
    overrides: Partial<ICreateWorkerDTO> = {},
  ): ICreateWorkerDTO => ({
    name: faker.word.words(1),
    registration_token_id: registrationToken.id,
    internal_id: faker.string.uuid(),
    signature: sha256(),
    missing: false,
    user_id: user.id,
    version: null,
    system_info: { os: "Linux" },
    agent_info: {},
    payload: {},
    description: null,
    tags: null,
    last_seen_at: null,
    refresh_token: "",
    refresh_token_expires_at: new Date(),
    ...overrides,
  });

  it("should create and find one worker with relations", async () => {
    const created = await repository.createOne(buildCreateData());

    const found = await repository.findOne({ id: created.id });

    expect(found?.id).toBe(created.id);
    expect(found?.user_id).toBe(user.id);
    expect(found?.registration_token_id).toBe(registrationToken.id);
    expect(found?.registration_token.id).toBe(registrationToken.id);
  });

  it("should return null finding a worker that does not exist", async () => {
    const found = await repository.findOne({ id: faker.string.uuid() });

    expect(found).toBeNull();
  });

  it("should find one worker by registration_token, internal_id and signature", async () => {
    const internal_id = faker.string.uuid();
    const signature = sha256();
    const created = await repository.createOne(
      buildCreateData({ internal_id, signature }),
    );

    const found = await repository.findOne({
      registration_token: registrationToken.token,
      internal_id,
      signature,
    });

    expect(found?.id).toBe(created.id);
  });

  it("should find many workers filtered by user_id with pagination and sorting", async () => {
    const owned = await workerFactory.create(
      {},
      {
        associations: { user, registration_token: registrationToken },
      },
    );
    const otherUser = await userFactory.create();
    await workerFactory.create(
      {},
      {
        associations: { user: otherUser },
      },
    );

    const result = await repository.findMany(
      { user_id: user.id },
      { skip: 0, take: 10 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(owned.id);
  });

  it("should find many workers filtered by missing and refresh_token", async () => {
    const worker = await repository.createOne(
      buildCreateData({ missing: true, refresh_token: "some-refresh-token" }),
    );

    const result = await repository.findMany({
      missing: true,
      refresh_token: "some-refresh-token",
    });

    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: worker.id })]),
    );
  });

  it("should find many workers filtered by last_seen_at range", async () => {
    const recent = await workerFactory.create(
      { last_seen_at: new Date() },
      { associations: { user, registration_token: registrationToken } },
    );
    await workerFactory.create(
      { last_seen_at: null },
      { associations: { user, registration_token: registrationToken } },
    );

    const result = await repository.findMany({
      last_seen_at_start_date: new Date(Date.now() - 60_000),
      last_seen_at_end_date: new Date(Date.now() + 60_000),
    });

    expect(result.map(worker => worker.id)).toContain(recent.id);
  });

  it("should filter workers by archived flag", async () => {
    const active = await workerFactory.create(
      { archived_at: null },
      { associations: { user, registration_token: registrationToken } },
    );
    const archived = await workerFactory.create(
      { archived_at: new Date() },
      { associations: { user, registration_token: registrationToken } },
    );

    const activeResult = await repository.findMany({ archived: false });
    const archivedResult = await repository.findMany({ archived: true });

    expect(activeResult.map(worker => worker.id)).toContain(active.id);
    expect(activeResult.map(worker => worker.id)).not.toContain(archived.id);
    expect(archivedResult.map(worker => worker.id)).toContain(archived.id);
  });

  it("should count workers by filter", async () => {
    await repository.createOne(buildCreateData());
    await repository.createOne(buildCreateData());

    const count = await repository.getCount({ user_id: user.id });

    expect(count).toBe(2);
  });

  it("should update one worker", async () => {
    const worker = await repository.createOne(buildCreateData());

    const updated = await repository.updateOne(
      { id: worker.id },
      { name: "Updated", missing: true },
    );

    expect(updated).toMatchObject({
      id: worker.id,
      name: "Updated",
      missing: true,
    });

    const found = await repository.findOne({ id: worker.id });
    expect(found?.name).toBe("Updated");
  });

  it("should return null updating a worker that does not exist", async () => {
    const updated = await repository.updateOne(
      { id: faker.string.uuid() },
      { name: "Updated" },
    );

    expect(updated).toBeNull();
  });

  it("should soft delete one worker setting archived_at", async () => {
    const worker = await repository.createOne(buildCreateData());

    const deleted = await repository.deleteOne({ id: worker.id });

    expect(deleted?.id).toBe(worker.id);
    expect(deleted?.archived_at).toBeInstanceOf(Date);

    const stillFound = await repository.findOne({ id: worker.id });
    expect(stillFound?.archived_at).toBeInstanceOf(Date);
  });

  it("should return null deleting a worker that does not exist", async () => {
    const deleted = await repository.deleteOne({ id: faker.string.uuid() });

    expect(deleted).toBeNull();
  });
});
