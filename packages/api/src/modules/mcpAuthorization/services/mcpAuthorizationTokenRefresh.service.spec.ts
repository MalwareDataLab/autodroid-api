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

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Entity import
import { McpAuthorizationGrant } from "../entities/mcpAuthorizationGrant.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Service import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";

// Target import
import { McpAuthorizationTokenRefreshService } from "./mcpAuthorizationTokenRefresh.service";

const tokenIssueExecuteMock = vi.fn();
vi.mock("./mcpAuthorizationTokenIssue.service", () => ({
  McpAuthorizationTokenIssueService: vi.fn(() => ({
    execute: tokenIssueExecuteMock,
  })),
}));

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const MCP_RESOURCE = "https://api.autodroid.example/mcp";
const NOW = new Date("2026-01-01T00:00:00.000Z");
const CHAIN_DEADLINE = NOW.getTime() + 1;

const REFRESH_TOKEN = "the-refresh-token";
const REFRESH_TOKEN_HASH = createHash("sha256")
  .update(REFRESH_TOKEN)
  .digest("base64url");

const CLIENT = { client_id: "mcpc1.abc.def" } as any;

const tokenRecord = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    client_id: "mcpc1.abc.def",
    user_auth_provider_conn_id: "conn-1",
    grant_id: "grant-1",
    token_generation: 1,
    grant_expires_at: CHAIN_DEADLINE,
    resource: MCP_RESOURCE,
    scopes: ["autodroid:read", "autodroid:write"],
    ...overrides,
  });

const activeGrant = (overrides: Partial<McpAuthorizationGrant> = {}) =>
  ({
    id: "grant-1",
    token_generation: 1,
    scopes: ["autodroid:read", "autodroid:write"],
    ...overrides,
  }) as McpAuthorizationGrant;

describe("Service: McpAuthorizationTokenRefreshService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;
  let multiChainMock: {
    del: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  };
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let mcpAuthorizationGrantRepositoryMock: Mocked<IMcpAuthorizationGrantRepository>;
  let service: McpAuthorizationTokenRefreshService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.mocked(getMcpConfig).mockReturnValue({
      resource: MCP_RESOURCE,
    } as ReturnType<typeof getMcpConfig>);

    getMock = vi.fn().mockResolvedValue(tokenRecord());
    setMock = vi.fn().mockResolvedValue("OK");
    multiChainMock = {
      del: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 1],
        [null, "OK"],
      ]),
    };

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: {
        get: getMock,
        set: setMock,
        multi: vi.fn(() => multiChainMock),
      },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    mcpAuthorizationGrantRepositoryMock = {
      findOne: vi.fn().mockResolvedValue(activeGrant()),
      updateMany: vi.fn().mockResolvedValue(1),
    } as unknown as Mocked<IMcpAuthorizationGrantRepository>;

    service = new McpAuthorizationTokenRefreshService(
      inMemoryDatabaseProviderMock,
      mcpAuthorizationGrantRepositoryMock,
    );

    tokenIssueExecuteMock.mockResolvedValue({
      access_token: "new-at",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "new-rt",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should rotate the token: claim it, mint new tokens, and mark it used", async () => {
    const result = await service.execute({
      client: CLIENT,
      refreshToken: REFRESH_TOKEN,
    });

    expect(getMock).toHaveBeenCalledWith(
      `mcp-oauth:refresh:${REFRESH_TOKEN_HASH}`,
    );
    expect(multiChainMock.del).toHaveBeenCalledWith(
      `mcp-oauth:refresh:${REFRESH_TOKEN_HASH}`,
    );
    expect(multiChainMock.set).toHaveBeenCalledWith(
      `mcp-oauth:refresh-used:${REFRESH_TOKEN_HASH}`,
      JSON.stringify({ grant_id: "grant-1" }),
      "EX",
      2592000,
    );
    expect(multiChainMock.exec).toHaveBeenCalledOnce();
    expect(mcpAuthorizationGrantRepositoryMock.findOne).toHaveBeenCalledWith({
      id: "grant-1",
      active: true,
    });
    expect(McpAuthorizationTokenIssueService).toHaveBeenCalledWith(
      inMemoryDatabaseProviderMock,
      mcpAuthorizationGrantRepositoryMock,
    );
    expect(tokenIssueExecuteMock).toHaveBeenCalledWith({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      resource: MCP_RESOURCE,
      scopes: ["autodroid:read", "autodroid:write"],
      grant_scopes: ["autodroid:read", "autodroid:write"],
      grant_id: "grant-1",
      token_generation: 1,
      grant_expires_at: CHAIN_DEADLINE,
    });

    expect(result).toEqual({
      access_token: "new-at",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "new-rt",
    });
  });

  it("should carry a matching resource forward into the reissued tokens", async () => {
    getMock.mockResolvedValueOnce(
      tokenRecord({ resource: "https://api.autodroid.example/mcp" }),
    );

    await service.execute({
      client: CLIENT,
      refreshToken: REFRESH_TOKEN,
      resource: new URL("https://api.autodroid.example/mcp"),
    });

    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "https://api.autodroid.example/mcp",
        grant_id: "grant-1",
      }),
    );
  });

  it("should reject refreshing a token whose grant is revoked or past its absolute lifetime in the database, even though the token is still in Redis", async () => {
    mcpAuthorizationGrantRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );

    expect(multiChainMock.exec).not.toHaveBeenCalled();
    expect(
      mcpAuthorizationGrantRepositoryMock.updateMany,
    ).not.toHaveBeenCalled();
    expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
  });

  it("should reject a token issued before the connection was revoked, even after a re-authorization reactivated the same row", async () => {
    mcpAuthorizationGrantRepositoryMock.findOne.mockResolvedValueOnce(
      activeGrant({ token_generation: 2 }),
    );

    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );

    expect(multiChainMock.exec).not.toHaveBeenCalled();
    expect(
      mcpAuthorizationGrantRepositoryMock.updateMany,
    ).not.toHaveBeenCalled();
    expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
  });

  it.each([
    ["reached", NOW.getTime()],
    ["passed", NOW.getTime() - 1],
    ["never recorded", undefined],
  ])(
    "should reject, without spending it, a token whose own chain's absolute deadline was %s, even though a re-authorization renewed the connection",
    async (_label, grant_expires_at) => {
      getMock.mockResolvedValueOnce(tokenRecord({ grant_expires_at }));

      await expect(
        service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
          statusCode: 400,
        }),
      );

      expect(multiChainMock.exec).not.toHaveBeenCalled();
      expect(
        mcpAuthorizationGrantRepositoryMock.updateMany,
      ).not.toHaveBeenCalled();
      expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["asks for no scope", undefined],
    ["asks for one of the scopes it was issued", ["autodroid:read"]],
  ])(
    "should reject with invalid_grant, without spending it, a token holding no scope the connection still grants after a re-authorization narrowed it, when the refresh %s",
    async (_label, scopes) => {
      getMock.mockResolvedValueOnce(
        tokenRecord({ scopes: ["autodroid:read"] }),
      );
      mcpAuthorizationGrantRepositoryMock.findOne.mockResolvedValueOnce(
        activeGrant({ scopes: ["autodroid:write"] }),
      );

      await expect(
        service.execute({
          client: CLIENT,
          refreshToken: REFRESH_TOKEN,
          scopes,
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
          statusCode: 400,
        }),
      );

      expect(multiChainMock.exec).not.toHaveBeenCalled();
      expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
    },
  );

  it("should reissue only the scopes the connection still holds after a re-authorization narrowed them", async () => {
    mcpAuthorizationGrantRepositoryMock.findOne.mockResolvedValueOnce(
      activeGrant({ scopes: ["autodroid:read"] }),
    );

    await service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN });

    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["autodroid:read"],
        grant_scopes: ["autodroid:read"],
      }),
    );
  });

  it("should refuse a refresh asking for a scope a re-authorization took away, without spending the token", async () => {
    mcpAuthorizationGrantRepositoryMock.findOne.mockResolvedValueOnce(
      activeGrant({ scopes: ["autodroid:read"] }),
    );

    await expect(
      service.execute({
        client: CLIENT,
        refreshToken: REFRESH_TOKEN,
        scopes: ["autodroid:write"],
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_SCOPE",
      }),
    );

    expect(multiChainMock.exec).not.toHaveBeenCalled();
  });

  it("should reject a token record that names no grant, without looking any grant up", async () => {
    getMock.mockResolvedValue(tokenRecord({ grant_id: undefined }));

    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );

    expect(mcpAuthorizationGrantRepositoryMock.findOne).not.toHaveBeenCalled();
    expect(multiChainMock.exec).not.toHaveBeenCalled();
  });

  it("should throw invalid_grant when the token does not exist and was never used", async () => {
    getMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
        statusCode: 400,
      }),
    );
    expect(
      mcpAuthorizationGrantRepositoryMock.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("should revoke the whole grant when a rotated-away token is replayed", async () => {
    getMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ grant_id: "grant-1" }));

    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );

    expect(
      mcpAuthorizationGrantRepositoryMock.updateMany,
    ).toHaveBeenCalledOnce();
    expect(mcpAuthorizationGrantRepositoryMock.updateMany).toHaveBeenCalledWith(
      { id: "grant-1", active: true },
      { revoked_at: NOW },
    );
    expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
  });

  it("should revoke the grant in one step no matter how many times it was rotated since the replayed token — no chain to walk, so no hop count to outrun", async () => {
    getMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ grant_id: "grant-1" }));

    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(
      mcpAuthorizationGrantRepositoryMock.updateMany,
    ).toHaveBeenCalledTimes(1);
    expect(mcpAuthorizationGrantRepositoryMock.updateMany).toHaveBeenCalledWith(
      { id: "grant-1", active: true },
      { revoked_at: NOW },
    );
  });

  it("should throw invalid_grant when the token was issued to a different client", async () => {
    await expect(
      service.execute({
        client: { client_id: "mcpc1.other.client" } as any,
        refreshToken: REFRESH_TOKEN,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );
    expect(multiChainMock.exec).not.toHaveBeenCalled();
    expect(
      mcpAuthorizationGrantRepositoryMock.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("should throw invalid_grant when resource is given but the token carries none", async () => {
    getMock.mockResolvedValueOnce(tokenRecord({ resource: undefined }));

    await expect(
      service.execute({
        client: CLIENT,
        refreshToken: REFRESH_TOKEN,
        resource: new URL("https://api.autodroid.example/mcp"),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );
  });

  it("should treat an omitted resource as this server's own, since it serves exactly one", async () => {
    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).resolves.toBeDefined();
    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({ resource: MCP_RESOURCE }),
    );
  });

  it("should throw invalid_grant when the request names a different resource than the token was issued for", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        refreshToken: REFRESH_TOKEN,
        resource: new URL("https://other-server.example.com/mcp"),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );
  });

  it("should treat losing a concurrent claim as reuse and end the whole grant", async () => {
    multiChainMock.exec.mockResolvedValueOnce([
      [null, 0],
      [null, "OK"],
    ]);

    await expect(
      service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
      }),
    );
    expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
    expect(mcpAuthorizationGrantRepositoryMock.updateMany).toHaveBeenCalledWith(
      { id: "grant-1", active: true },
      { revoked_at: NOW },
    );
  });

  it("should reissue the scopes the grant holds when the refresh asks for none", async () => {
    await service.execute({ client: CLIENT, refreshToken: REFRESH_TOKEN });

    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["autodroid:read", "autodroid:write"],
      }),
    );
  });

  it("should reissue fewer scopes when the refresh asks for a subset", async () => {
    await service.execute({
      client: CLIENT,
      refreshToken: REFRESH_TOKEN,
      scopes: ["autodroid:read"],
    });

    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["autodroid:read"],
        grant_scopes: ["autodroid:read", "autodroid:write"],
      }),
    );
  });

  it("should reissue the scopes asked for once each, in the fixed order", async () => {
    await service.execute({
      client: CLIENT,
      refreshToken: REFRESH_TOKEN,
      scopes: ["autodroid:write", "autodroid:read", "autodroid:write"],
    });

    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["autodroid:read", "autodroid:write"],
      }),
    );
  });

  it("should refuse a refresh that asks for a scope the grant does not hold, without spending the token", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        refreshToken: REFRESH_TOKEN,
        scopes: ["autodroid:read", "autodroid:admin"],
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_token_refresh_service/INVALID_SCOPE",
        statusCode: 400,
      }),
    );

    expect(multiChainMock.exec).not.toHaveBeenCalled();
    expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
  });
});
