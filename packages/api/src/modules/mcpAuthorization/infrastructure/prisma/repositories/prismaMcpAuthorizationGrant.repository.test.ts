import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";

// Factory import
import { mcpAuthorizationGrantFactory } from "@modules/mcpAuthorization/entities/factories/mcpAuthorizationGrant.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

const DAY_MS = 24 * 60 * 60 * 1000;

const RESOURCE = "https://api.autodroid.example/mcp";

describe("Repository: PrismaMcpAuthorizationGrantRepository", () => {
  let repository: IMcpAuthorizationGrantRepository;
  let user: User;

  beforeEach(async () => {
    repository = container.resolve("McpAuthorizationGrantRepository");
    user = await userFactory.create();
  });

  it("should store a grant and read the same row back", async () => {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 90 * DAY_MS);

    const created = await repository.createOne({
      id: "grant-created",
      user_id: user.id,
      client_id: "mcpc1.abc.def",
      client_name: null,
      resource: RESOURCE,
      scopes: ["autodroid:read"],
      created_at: createdAt,
      expires_at: expiresAt,
      last_used_at: null,
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: "grant-created",
        user_id: user.id,
        client_id: "mcpc1.abc.def",
        client_name: null,
        resource: RESOURCE,
        scopes: ["autodroid:read"],
        token_generation: 0,
        created_at: createdAt,
        expires_at: expiresAt,
        revoked_at: null,
        last_used_at: null,
        seq: expect.any(BigInt),
        updated_at: expect.any(Date),
      }),
    );
    await expect(repository.findOne({ id: "grant-created" })).resolves.toEqual(
      created,
    );
  });

  it("should number grants in creation order and stamp the moment each one last changed", async () => {
    const grantFields = {
      user_id: user.id,
      client_name: null,
      resource: RESOURCE,
      scopes: ["autodroid:read"],
      created_at: new Date(),
      expires_at: new Date(Date.now() + DAY_MS),
      last_used_at: null,
    };
    const first = await repository.createOne({
      ...grantFields,
      id: "grant-first",
      client_id: "mcpc1.first",
    });
    const second = await repository.createOne({
      ...grantFields,
      id: "grant-second",
      client_id: "mcpc1.second",
    });

    const revoked = await repository.updateOne(
      { id: first.id },
      { revoked_at: new Date() },
    );

    expect(second.seq).toBeGreaterThan(first.seq);
    expect(revoked?.seq).toBe(first.seq);
    expect(revoked?.updated_at.getTime()).toBeGreaterThan(
      first.updated_at.getTime(),
    );
  });

  it("should refuse a grant for a user that does not exist", async () => {
    await expect(
      repository.createOne({
        id: "grant-orphan",
        user_id: "no-such-user",
        client_id: "mcpc1.abc.def",
        client_name: null,
        resource: RESOURCE,
        scopes: ["autodroid:read"],
        created_at: new Date(),
        expires_at: new Date(Date.now() + DAY_MS),
        last_used_at: null,
      }),
    ).rejects.toThrowError(/Foreign key constraint/);
  });

  describe("upsertOne", () => {
    const authorization = (overrides: Record<string, unknown> = {}) => ({
      id: randomUUID(),
      user_id: user.id,
      client_id: "https://agent.example.com/client.json",
      client_name: "Example Agent",
      resource: RESOURCE,
      scopes: ["autodroid:read", "autodroid:write"],
      expires_at: new Date(Date.now() + 90 * DAY_MS),
      last_used_at: new Date(),
      ...overrides,
    });

    it("should create the connection with the given id when the user never authorized this client for this resource", async () => {
      const data = authorization({ id: "grant-first-authorization" });

      const created = await repository.upsertOne(data);

      expect(created).toEqual(
        expect.objectContaining({
          ...data,
          token_generation: 0,
          revoked_at: null,
          seq: expect.any(BigInt),
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        }),
      );
      await expect(
        repository.findOne({ id: "grant-first-authorization", active: true }),
      ).resolves.toEqual(created);
    });

    it("should renew the same row in place when the client authorizes again, keeping its id, first-connected time and sequence", async () => {
      const first = await repository.upsertOne(
        authorization({ id: "grant-kept" }),
      );
      const renewal = authorization({
        id: "grant-discarded",
        client_name: "Renamed Agent",
        scopes: ["autodroid:read"],
        expires_at: new Date(Date.now() + 91 * DAY_MS),
        last_used_at: new Date(Date.now() + 1000),
      });

      const renewed = await repository.upsertOne(renewal);

      expect(renewed).toEqual(
        expect.objectContaining({
          id: "grant-kept",
          seq: first.seq,
          created_at: first.created_at,
          client_name: "Renamed Agent",
          scopes: ["autodroid:read"],
          expires_at: renewal.expires_at,
          last_used_at: renewal.last_used_at,
          revoked_at: null,
          token_generation: 0,
        }),
      );
      expect(renewed.updated_at.getTime()).toBeGreaterThanOrEqual(
        first.updated_at.getTime(),
      );
      await expect(repository.findMany({ user_id: user.id })).resolves.toEqual([
        renewed,
      ]);
      await expect(
        repository.findOne({ id: "grant-discarded" }),
      ).resolves.toBeNull();
    });

    it("should reactivate a revoked connection on the same row, while its token generation stays moved past the tokens the revocation ended", async () => {
      const first = await repository.upsertOne(
        authorization({ id: "grant-reactivated" }),
      );
      await repository.updateOne({ id: first.id }, { revoked_at: new Date() });

      const reactivated = await repository.upsertOne(authorization());

      expect(reactivated).toEqual(
        expect.objectContaining({
          id: "grant-reactivated",
          revoked_at: null,
          token_generation: 1,
        }),
      );
      await expect(
        repository.findMany({ user_id: user.id, active: true }),
      ).resolves.toEqual([reactivated]);
    });

    it("should reactivate a connection past its absolute lifetime with a fresh one", async () => {
      const expired = await mcpAuthorizationGrantFactory.create({
        user_id: user.id,
        client_id: "https://agent.example.com/client.json",
        resource: RESOURCE,
        expires_at: new Date(Date.now() - 1000),
      });
      const renewal = authorization();

      const renewed = await repository.upsertOne(renewal);

      expect(renewed).toEqual(
        expect.objectContaining({
          id: expired.id,
          expires_at: renewal.expires_at,
          token_generation: 0,
        }),
      );
      await expect(
        repository.findOne({ id: expired.id, active: true }),
      ).resolves.toEqual(renewed);
    });

    it("should keep separate rows for another client, another resource and another user", async () => {
      const otherUser = await userFactory.create();
      const original = await repository.upsertOne(authorization());

      const otherClient = await repository.upsertOne(
        authorization({ client_id: "https://other.example.com/client.json" }),
      );
      const otherResource = await repository.upsertOne(
        authorization({ resource: "https://other-api.autodroid.example/mcp" }),
      );
      const otherUsers = await repository.upsertOne(
        authorization({ user_id: otherUser.id }),
      );

      const ids = [original, otherClient, otherResource, otherUsers].map(
        grant => grant.id,
      );
      expect(new Set(ids).size).toBe(4);
      await expect(
        repository.findMany({ user_id: user.id }),
      ).resolves.toHaveLength(3);
      await expect(
        repository.findMany({ user_id: otherUser.id }),
      ).resolves.toEqual([otherUsers]);
    });

    it("should find a user's connection by client and resource, revoked or not, and not another client's, resource's or user's", async () => {
      const otherUser = await userFactory.create();
      const original = await repository.upsertOne(authorization());
      await repository.upsertOne(
        authorization({ client_id: "https://other.example.com/client.json" }),
      );
      await repository.upsertOne(
        authorization({ resource: "https://other-api.autodroid.example/mcp" }),
      );
      await repository.upsertOne(authorization({ user_id: otherUser.id }));
      await repository.updateMany(
        { id: original.id },
        { revoked_at: new Date() },
      );

      await expect(
        repository.findOne({
          user_id: user.id,
          client_id: original.client_id,
          resource: RESOURCE,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          id: original.id,
          revoked_at: expect.any(Date),
          token_generation: 1,
        }),
      );
      await expect(
        repository.findOne({
          user_id: user.id,
          client_id: "https://never-authorized.example.com/client.json",
          resource: RESOURCE,
        }),
      ).resolves.toBeNull();
    });

    it("should leave exactly one row when the same client completes several authorizations at once", async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => repository.upsertOne(authorization())),
      );

      expect(new Set(results.map(grant => grant.id)).size).toBe(1);
      await expect(
        repository.findMany({ user_id: user.id }),
      ).resolves.toHaveLength(1);
    });

    it("should refuse a connection for a user that does not exist", async () => {
      await expect(
        repository.upsertOne(authorization({ user_id: "no-such-user" })),
      ).rejects.toThrowError(/Foreign key constraint/);
    });
  });

  it("should find an active grant, but neither a revoked nor an expired one", async () => {
    const active = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
    });
    const revoked = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
      revoked_at: new Date(),
    });
    const expired = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
      expires_at: new Date(Date.now() - 1000),
    });

    await expect(
      repository.findOne({ id: active.id, active: true }),
    ).resolves.toEqual(expect.objectContaining({ id: active.id }));
    await expect(
      repository.findOne({ id: revoked.id, active: true }),
    ).resolves.toBeNull();
    await expect(
      repository.findOne({ id: expired.id, active: true }),
    ).resolves.toBeNull();
    await expect(repository.findOne({ id: revoked.id })).resolves.toEqual(
      expect.objectContaining({ id: revoked.id }),
    );
  });

  it("should list every one of a user's 101+ active grants, newest first, and none of another user's", async () => {
    const otherUser = await userFactory.create();
    const base = Date.now() - 200 * 60 * 1000;
    await Promise.all(
      Array.from({ length: 105 }, (_, index) =>
        mcpAuthorizationGrantFactory.create({
          id: `grant-${String(index).padStart(3, "0")}`,
          user_id: user.id,
          created_at: new Date(base + index * 60 * 1000),
        }),
      ),
    );
    await mcpAuthorizationGrantFactory.create({ user_id: otherUser.id });
    await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
      revoked_at: new Date(),
    });

    const result = await repository.findMany({
      user_id: user.id,
      active: true,
    });

    expect(result).toHaveLength(105);
    expect(result[0].id).toBe("grant-104");
    expect(result[104].id).toBe("grant-000");
    expect(result.every(grant => grant.user_id === user.id)).toBe(true);
  });

  it("should update only the grant that matches the filter, and return null when none does", async () => {
    const otherUser = await userFactory.create();
    const grant = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
    });
    const revokedAt = new Date();

    await expect(
      repository.updateOne(
        { id: grant.id, user_id: otherUser.id, active: true },
        { revoked_at: revokedAt },
      ),
    ).resolves.toBeNull();
    const updated = await repository.updateOne(
      { id: grant.id, user_id: user.id, active: true },
      { revoked_at: revokedAt },
    );

    expect(updated).toEqual(
      expect.objectContaining({
        id: grant.id,
        revoked_at: revokedAt,
        token_generation: 1,
      }),
    );
  });

  it("should record a use without moving the token generation", async () => {
    const grant = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
    });
    const usedAt = new Date();

    const count = await repository.updateMany(
      { id: grant.id },
      { last_used_at: usedAt },
    );

    expect(count).toBe(1);
    await expect(repository.findOne({ id: grant.id })).resolves.toEqual(
      expect.objectContaining({ last_used_at: usedAt, token_generation: 0 }),
    );
  });

  it("should revoke all of one user's active grants at once, leaving another user's and an earlier revocation untouched", async () => {
    const otherUser = await userFactory.create();
    const earlierRevocation = new Date(Date.now() - DAY_MS);
    await mcpAuthorizationGrantFactory.create({ user_id: user.id });
    await mcpAuthorizationGrantFactory.create({ user_id: user.id });
    const alreadyRevoked = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
      revoked_at: earlierRevocation,
    });
    const othersGrant = await mcpAuthorizationGrantFactory.create({
      user_id: otherUser.id,
    });

    const count = await repository.updateMany(
      { user_id: user.id, active: true },
      { revoked_at: new Date() },
    );

    expect(count).toBe(2);
    await expect(
      repository.findMany({ user_id: user.id, active: true }),
    ).resolves.toEqual([]);
    expect(
      (await repository.findMany({ user_id: user.id }))
        .filter(grant => grant.id !== alreadyRevoked.id)
        .map(grant => grant.token_generation),
    ).toEqual([1, 1]);
    await expect(
      repository.findOne({ id: alreadyRevoked.id }),
    ).resolves.toEqual(
      expect.objectContaining({
        revoked_at: earlierRevocation,
        token_generation: 0,
      }),
    );
    await expect(
      repository.findOne({ id: othersGrant.id, active: true }),
    ).resolves.toEqual(expect.objectContaining({ id: othersGrant.id }));
  });

  it("should refuse a bulk update naming neither a grant nor an owner, leaving every user's grants active", async () => {
    const grant = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
    });

    await expect(
      repository.updateMany({ active: true }, { revoked_at: new Date() }),
    ).rejects.toThrowError("A bulk grant update needs an id or a user_id.");

    await expect(
      repository.findOne({ id: grant.id, active: true }),
    ).resolves.toEqual(expect.objectContaining({ id: grant.id }));
  });

  it("should delete a user's grants with the user", async () => {
    const grant = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
    });

    await container
      .resolve<{ client: PrismaClient }>("DatabaseProvider")
      .client.user.delete({ where: { id: user.id } });

    await expect(repository.findOne({ id: grant.id })).resolves.toBeNull();
  });
});
