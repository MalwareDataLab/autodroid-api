import { createHash } from "node:crypto";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Target import
import { McpAuthorizationTokenRevokeService } from "./mcpAuthorizationTokenRevoke.service";

const TOKEN = "the-token";
const TOKEN_HASH = createHash("sha256").update(TOKEN).digest("base64url");

const CLIENT = { client_id: "mcpc1.abc.def" } as any;
const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("Service: McpAuthorizationTokenRevokeService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let delMock: ReturnType<typeof vi.fn>;
  let updateManyMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationTokenRevokeService;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });

    getMock = vi.fn().mockResolvedValue(null);
    updateManyMock = vi.fn().mockResolvedValue(1);
    delMock = vi.fn().mockResolvedValue(1);

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock, del: delMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationTokenRevokeService(
      inMemoryDatabaseProviderMock,
      {
        updateMany: updateManyMock,
      } as unknown as Mocked<IMcpAuthorizationGrantRepository>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should delete the token from the access keyspace when owned by the revoking client", async () => {
    getMock.mockImplementation(async (key: string) =>
      key === `mcp-oauth:access:${TOKEN_HASH}`
        ? JSON.stringify({ client_id: "mcpc1.abc.def" })
        : null,
    );

    await service.execute({ client: CLIENT, request: { token: TOKEN } });

    expect(delMock).toHaveBeenCalledWith(`mcp-oauth:access:${TOKEN_HASH}`);
    expect(delMock).not.toHaveBeenCalledWith(`mcp-oauth:refresh:${TOKEN_HASH}`);
  });

  it("should delete the token from the refresh keyspace when owned by the revoking client", async () => {
    getMock.mockImplementation(async (key: string) =>
      key === `mcp-oauth:refresh:${TOKEN_HASH}`
        ? JSON.stringify({ client_id: "mcpc1.abc.def", grant_id: "grant-1" })
        : null,
    );

    await service.execute({ client: CLIENT, request: { token: TOKEN } });

    expect(delMock).toHaveBeenCalledWith(`mcp-oauth:refresh:${TOKEN_HASH}`);
    expect(delMock).not.toHaveBeenCalledWith(`mcp-oauth:access:${TOKEN_HASH}`);
  });

  it("should also end the whole grant when a refresh token is revoked, so its live access tokens stop too (RFC 7009 §2.1)", async () => {
    getMock.mockImplementation(async (key: string) =>
      key === `mcp-oauth:refresh:${TOKEN_HASH}`
        ? JSON.stringify({ client_id: "mcpc1.abc.def", grant_id: "grant-1" })
        : null,
    );

    await service.execute({ client: CLIENT, request: { token: TOKEN } });

    expect(updateManyMock).toHaveBeenCalledWith(
      { id: "grant-1", active: true },
      { revoked_at: NOW },
    );
  });

  it("should leave the grant alone when only an access token is revoked", async () => {
    getMock.mockImplementation(async (key: string) =>
      key === `mcp-oauth:access:${TOKEN_HASH}`
        ? JSON.stringify({ client_id: "mcpc1.abc.def", grant_id: "grant-1" })
        : null,
    );

    await service.execute({ client: CLIENT, request: { token: TOKEN } });

    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("should not delete a token owned by a different client", async () => {
    getMock.mockResolvedValue(
      JSON.stringify({ client_id: "mcpc1.other.client" }),
    );

    await expect(
      service.execute({ client: CLIENT, request: { token: TOKEN } }),
    ).resolves.toBeUndefined();
    expect(delMock).not.toHaveBeenCalled();
  });

  it("should succeed silently when the token does not exist in either keyspace", async () => {
    await expect(
      service.execute({ client: CLIENT, request: { token: TOKEN } }),
    ).resolves.toBeUndefined();
    expect(delMock).not.toHaveBeenCalled();
  });
});
