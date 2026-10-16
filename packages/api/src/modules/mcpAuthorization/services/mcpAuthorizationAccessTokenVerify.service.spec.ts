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

// Repository import
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Target import
import { McpAuthorizationAccessTokenVerifyService } from "./mcpAuthorizationAccessTokenVerify.service";

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const MCP_RESOURCE = "https://api.autodroid.example/mcp";
const NOW = new Date("2026-01-01T00:00:00.000Z");

const ACCESS_TOKEN = "the-access-token";
const ACCESS_TOKEN_HASH = createHash("sha256")
  .update(ACCESS_TOKEN)
  .digest("base64url");

const USER_AUTH_PROVIDER_CONN = {
  id: "conn-1",
  auth_provider: "FIREBASE",
  code: "firebase-uid",
  disconnected_at: null,
  user_id: "user-1",
  user: { id: "user-1", email: "someone@example.test" },
};

describe("Service: McpAuthorizationAccessTokenVerifyService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let findOneMock: ReturnType<typeof vi.fn>;
  let grantFindOneMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let userAuthProviderConnRepositoryMock: Mocked<IUserAuthProviderConnRepository>;
  let service: McpAuthorizationAccessTokenVerifyService;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.mocked(getMcpConfig).mockReturnValue({
      resource: MCP_RESOURCE,
    } as ReturnType<typeof getMcpConfig>);

    getMock = vi.fn().mockImplementation(async (key: string) => {
      if (key === `mcp-oauth:access:${ACCESS_TOKEN_HASH}`)
        return JSON.stringify({
          client_id: "mcpc1.abc.def",
          user_auth_provider_conn_id: "conn-1",
          resource: "https://api.autodroid.example/mcp",
          grant_id: "grant-1",
          token_generation: 1,
          grant_expires_at: NOW.getTime() + 1,
          scopes: ["autodroid:read", "autodroid:write"],
          expires_at: 1700003600,
        });
      return null;
    });
    findOneMock = vi.fn().mockResolvedValue(USER_AUTH_PROVIDER_CONN);
    grantFindOneMock = vi.fn().mockResolvedValue({
      id: "grant-1",
      token_generation: 1,
      scopes: ["autodroid:read", "autodroid:write"],
    });

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    userAuthProviderConnRepositoryMock = {
      findOne: findOneMock,
    } as unknown as Mocked<IUserAuthProviderConnRepository>;

    service = new McpAuthorizationAccessTokenVerifyService(
      inMemoryDatabaseProviderMock,
      userAuthProviderConnRepositoryMock,
      {
        findOne: grantFindOneMock,
      } as unknown as Mocked<IMcpAuthorizationGrantRepository>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should resolve a valid token into AuthInfo carrying the caller's session", async () => {
    const result = await service.execute({ token: ACCESS_TOKEN });

    expect(getMock).toHaveBeenCalledWith(
      `mcp-oauth:access:${ACCESS_TOKEN_HASH}`,
    );
    expect(grantFindOneMock).toHaveBeenCalledWith({
      id: "grant-1",
      active: true,
    });
    expect(findOneMock).toHaveBeenCalledWith({ id: "conn-1" });

    expect(result.token).toBe(ACCESS_TOKEN);
    expect(result.clientId).toBe("mcpc1.abc.def");
    expect(result.scopes).toEqual(["autodroid:read", "autodroid:write"]);
    expect(result.expiresAt).toBe(1700003600);
    expect(result.resource).toEqual(
      new URL("https://api.autodroid.example/mcp"),
    );
    expect(result.extra?.session).toBeDefined();
    expect((result.extra?.session as any).user.id).toBe("user-1");
    expect((result.extra?.session as any).user_auth_provider_conn.id).toBe(
      "conn-1",
    );
  });

  it.each([
    ["was issued for a different resource", "https://other.example.com/mcp"],
    ["was bound to no resource at all", undefined],
  ])(
    "should throw a 401 when the token %s, since this server only accepts tokens issued for itself",
    async (_label, resource) => {
      getMock.mockImplementation(async (key: string) => {
        if (key === `mcp-oauth:access:${ACCESS_TOKEN_HASH}`)
          return JSON.stringify({
            client_id: "mcpc1.abc.def",
            user_auth_provider_conn_id: "conn-1",
            resource,
            grant_id: "grant-1",
            expires_at: 1700003600,
          });
        return "{}";
      });

      await expect(
        service.execute({ token: ACCESS_TOKEN }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
          statusCode: 401,
        }),
      );
      expect(findOneMock).not.toHaveBeenCalled();
    },
  );

  it("should throw a 401 when the token does not exist", async () => {
    getMock.mockResolvedValue(null);

    await expect(service.execute({ token: ACCESS_TOKEN })).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
        statusCode: 401,
      }),
    );
  });

  it("should throw a 401 when the connection was disconnected or deleted since the token was minted", async () => {
    findOneMock.mockResolvedValueOnce(null);

    await expect(service.execute({ token: ACCESS_TOKEN })).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
        statusCode: 401,
      }),
    );
  });

  it("should throw a 401 when the grant the token belongs to is no longer active in the database, even though the token is still in Redis", async () => {
    grantFindOneMock.mockResolvedValueOnce(null);

    await expect(service.execute({ token: ACCESS_TOKEN })).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
        statusCode: 401,
      }),
    );
    expect(grantFindOneMock).toHaveBeenCalledWith({
      id: "grant-1",
      active: true,
    });
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("should throw a 401 for a token issued before the connection was revoked, even after a re-authorization reactivated the same row", async () => {
    grantFindOneMock.mockResolvedValueOnce({
      id: "grant-1",
      token_generation: 2,
      scopes: ["autodroid:read", "autodroid:write"],
    });

    await expect(service.execute({ token: ACCESS_TOKEN })).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
        statusCode: 401,
      }),
    );
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it.each([
    ["reached", NOW.getTime()],
    ["passed", NOW.getTime() - 1],
    ["never recorded", undefined],
  ])(
    "should throw a 401 for a token whose own chain's absolute deadline was %s, even though a re-authorization renewed the connection",
    async (_label, grant_expires_at) => {
      getMock.mockResolvedValue(
        JSON.stringify({
          client_id: "mcpc1.abc.def",
          user_auth_provider_conn_id: "conn-1",
          resource: "https://api.autodroid.example/mcp",
          grant_id: "grant-1",
          token_generation: 1,
          grant_expires_at,
          scopes: ["autodroid:read", "autodroid:write"],
          expires_at: 1700003600,
        }),
      );

      await expect(
        service.execute({ token: ACCESS_TOKEN }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
          statusCode: 401,
        }),
      );
      expect(findOneMock).not.toHaveBeenCalled();
    },
  );

  it("should grant only the scopes the connection still holds after a re-authorization narrowed them", async () => {
    grantFindOneMock.mockResolvedValueOnce({
      id: "grant-1",
      token_generation: 1,
      scopes: ["autodroid:read"],
    });

    const result = await service.execute({ token: ACCESS_TOKEN });

    expect(result.scopes).toEqual(["autodroid:read"]);
  });

  it("should throw a 401 for a token record that names no grant, without looking any grant up", async () => {
    getMock.mockResolvedValue(
      JSON.stringify({
        client_id: "mcpc1.abc.def",
        user_auth_provider_conn_id: "conn-1",
        resource: "https://api.autodroid.example/mcp",
        expires_at: 1700003600,
      }),
    );

    await expect(service.execute({ token: ACCESS_TOKEN })).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
        statusCode: 401,
      }),
    );
    expect(grantFindOneMock).not.toHaveBeenCalled();
  });

  it.each([
    ["an administrator", true],
    ["a regular user", false],
  ])(
    "should carry the admin flag of %s into the session",
    async (_label, isAdmin) => {
      findOneMock.mockResolvedValue({
        ...USER_AUTH_PROVIDER_CONN,
        user: { ...USER_AUTH_PROVIDER_CONN.user, is_admin: isAdmin },
      });

      const result = await service.execute({ token: ACCESS_TOKEN });

      expect((result.extra?.session as any).is_admin).toBe(isAdmin);
    },
  );
});
