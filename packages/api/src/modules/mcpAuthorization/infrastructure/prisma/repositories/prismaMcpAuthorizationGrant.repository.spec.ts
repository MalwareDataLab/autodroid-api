import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Entity import
import { McpAuthorizationGrant } from "@modules/mcpAuthorization/entities/mcpAuthorizationGrant.entity";

// Target import
import { PrismaMcpAuthorizationGrantRepository } from "./prismaMcpAuthorizationGrant.repository";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "grant-1",
  user_id: "user-1",
  client_id: "mcpc1.abc.def",
  client_name: "Example Agent",
  resource: "https://api.autodroid.example/mcp",
  scopes: ["autodroid:read", "autodroid:write"],
  token_generation: 0,
  created_at: NOW,
  expires_at: new Date("2026-04-01T00:00:00.000Z"),
  revoked_at: null,
  last_used_at: null,
  ...overrides,
});

const ACTIVE_WHERE = {
  revoked_at: null,
  expires_at: { gt: NOW },
};

describe("Repository: PrismaMcpAuthorizationGrantRepository", () => {
  let client: {
    mcpAuthorizationGrant: {
      create: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaMcpAuthorizationGrantRepository;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });

    client = {
      mcpAuthorizationGrant: {
        create: vi.fn(),
        upsert: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    repository = new PrismaMcpAuthorizationGrantRepository({
      client,
    } as unknown as IDatabaseProvider);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a grant with no eager relations and return it as an entity", async () => {
    client.mcpAuthorizationGrant.create.mockResolvedValueOnce(row());
    const data = {
      id: "grant-1",
      user_id: "user-1",
      client_id: "mcpc1.abc.def",
      client_name: "Example Agent",
      resource: "https://api.autodroid.example/mcp",
      scopes: ["autodroid:read", "autodroid:write"],
      created_at: NOW,
      expires_at: new Date("2026-04-01T00:00:00.000Z"),
      last_used_at: null,
    };

    const result = await repository.createOne(data);

    expect(client.mcpAuthorizationGrant.create).toHaveBeenCalledWith({
      data,
      include: {},
    });
    expect(result).toBeInstanceOf(McpAuthorizationGrant);
    expect(result).toEqual(expect.objectContaining(row()));
  });

  it("should upsert the one grant of a user, client and resource: create it with the given id, or renew the existing one in place and reactivate it", async () => {
    const renewed = row({ id: "grant-kept", last_used_at: NOW });
    client.mcpAuthorizationGrant.upsert.mockResolvedValueOnce(renewed);
    const expiresAt = new Date("2026-04-01T00:00:00.000Z");

    const result = await repository.upsertOne({
      id: "grant-candidate",
      user_id: "user-1",
      client_id: "mcpc1.abc.def",
      client_name: "Example Agent",
      resource: "https://api.autodroid.example/mcp",
      scopes: ["autodroid:read"],
      expires_at: expiresAt,
      last_used_at: NOW,
    });

    expect(client.mcpAuthorizationGrant.upsert).toHaveBeenCalledWith({
      where: {
        user_id_client_id_resource: {
          user_id: "user-1",
          client_id: "mcpc1.abc.def",
          resource: "https://api.autodroid.example/mcp",
        },
      },
      create: {
        id: "grant-candidate",
        user_id: "user-1",
        client_id: "mcpc1.abc.def",
        resource: "https://api.autodroid.example/mcp",
        client_name: "Example Agent",
        scopes: ["autodroid:read"],
        expires_at: expiresAt,
        last_used_at: NOW,
      },
      update: {
        client_name: "Example Agent",
        scopes: ["autodroid:read"],
        expires_at: expiresAt,
        last_used_at: NOW,
        revoked_at: null,
      },
      include: {},
    });
    expect(result).toBeInstanceOf(McpAuthorizationGrant);
    expect(result).toEqual(expect.objectContaining(renewed));
  });

  it("should find one grant by id and owner, restricted to active grants when asked", async () => {
    client.mcpAuthorizationGrant.findFirst.mockResolvedValueOnce(row());

    const result = await repository.findOne({
      id: "grant-1",
      user_id: "user-1",
      active: true,
    });

    expect(client.mcpAuthorizationGrant.findFirst).toHaveBeenCalledWith({
      where: { id: "grant-1", user_id: "user-1", ...ACTIVE_WHERE },
      include: {},
    });
    expect(result).toBeInstanceOf(McpAuthorizationGrant);
    expect(result).toEqual(expect.objectContaining(row()));
  });

  it("should not restrict to active grants when the filter does not ask for it", async () => {
    client.mcpAuthorizationGrant.findFirst.mockResolvedValueOnce(
      row({ revoked_at: NOW }),
    );

    await repository.findOne({ id: "grant-1" });

    expect(client.mcpAuthorizationGrant.findFirst).toHaveBeenCalledWith({
      where: { id: "grant-1", user_id: undefined },
      include: {},
    });
  });

  it("should find the one grant of a user, client and resource", async () => {
    client.mcpAuthorizationGrant.findFirst.mockResolvedValueOnce(row());

    await repository.findOne({
      user_id: "user-1",
      client_id: "mcpc1.abc.def",
      resource: "https://api.autodroid.example/mcp",
    });

    expect(client.mcpAuthorizationGrant.findFirst).toHaveBeenCalledWith({
      where: {
        id: undefined,
        user_id: "user-1",
        client_id: "mcpc1.abc.def",
        resource: "https://api.autodroid.example/mcp",
      },
      include: {},
    });
  });

  it("should return null when no grant matches", async () => {
    client.mcpAuthorizationGrant.findFirst.mockResolvedValueOnce(null);

    await expect(repository.findOne({ id: "missing" })).resolves.toBeNull();
  });

  it("should list matching grants newest first, with no page cap", async () => {
    client.mcpAuthorizationGrant.findMany.mockResolvedValueOnce([
      row({ id: "newer" }),
      row({ id: "older" }),
    ]);

    const result = await repository.findMany({
      user_id: "user-1",
      active: true,
    });

    expect(client.mcpAuthorizationGrant.findMany).toHaveBeenCalledWith({
      where: { id: undefined, user_id: "user-1", ...ACTIVE_WHERE },
      include: {},
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
    expect(result.map(grant => grant.id)).toEqual(["newer", "older"]);
    result.forEach(grant =>
      expect(grant).toBeInstanceOf(McpAuthorizationGrant),
    );
  });

  it("should update the one matching grant by its id and return it", async () => {
    client.mcpAuthorizationGrant.findFirst.mockResolvedValueOnce(row());
    client.mcpAuthorizationGrant.update.mockResolvedValueOnce(
      row({ revoked_at: NOW }),
    );

    const result = await repository.updateOne(
      { id: "grant-1", user_id: "user-1", active: true },
      { revoked_at: NOW },
    );

    expect(client.mcpAuthorizationGrant.findFirst).toHaveBeenCalledWith({
      where: { id: "grant-1", user_id: "user-1", ...ACTIVE_WHERE },
      include: {},
    });
    expect(client.mcpAuthorizationGrant.update).toHaveBeenCalledWith({
      where: { id: "grant-1" },
      data: { revoked_at: NOW, token_generation: { increment: 1 } },
      include: {},
    });
    expect(result).toBeInstanceOf(McpAuthorizationGrant);
    expect(result?.revoked_at).toEqual(NOW);
  });

  it("should update nothing and return null when no grant matches", async () => {
    client.mcpAuthorizationGrant.findFirst.mockResolvedValueOnce(null);

    const result = await repository.updateOne(
      { id: "grant-1", user_id: "someone-else", active: true },
      { revoked_at: NOW },
    );

    expect(result).toBeNull();
    expect(client.mcpAuthorizationGrant.update).not.toHaveBeenCalled();
  });

  it("should update every matching grant in one statement and report how many changed", async () => {
    client.mcpAuthorizationGrant.updateMany.mockResolvedValueOnce({ count: 3 });

    const result = await repository.updateMany(
      { user_id: "user-1", active: true },
      { revoked_at: NOW },
    );

    expect(client.mcpAuthorizationGrant.updateMany).toHaveBeenCalledWith({
      where: { id: undefined, user_id: "user-1", ...ACTIVE_WHERE },
      data: { revoked_at: NOW, token_generation: { increment: 1 } },
    });
    expect(result).toBe(3);
  });

  it("should record a use without moving the token generation, so the connection's live tokens keep working", async () => {
    client.mcpAuthorizationGrant.updateMany.mockResolvedValueOnce({ count: 1 });

    await repository.updateMany({ id: "grant-1" }, { last_used_at: NOW });

    expect(client.mcpAuthorizationGrant.updateMany).toHaveBeenCalledWith({
      where: { id: "grant-1", user_id: undefined },
      data: { last_used_at: NOW },
    });
  });

  it("should refuse a bulk update that names neither a grant nor an owner, so it can never touch every user's grants", async () => {
    await expect(
      repository.updateMany({ active: true }, { revoked_at: NOW }),
    ).rejects.toThrowError("A bulk grant update needs an id or a user_id.");

    expect(client.mcpAuthorizationGrant.updateMany).not.toHaveBeenCalled();
  });

  it("should refuse a lookup that names neither a grant nor an owner, so a missing id can never match another user's grant", async () => {
    await expect(
      repository.findOne({ id: undefined, active: true }),
    ).rejects.toThrowError("A grant lookup needs an id or a user_id.");

    expect(client.mcpAuthorizationGrant.findFirst).not.toHaveBeenCalled();
  });
});
