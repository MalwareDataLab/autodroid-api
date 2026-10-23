import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Target import
import { McpAuthorizationRequestDecideService } from "./mcpAuthorizationRequestDecide.service";

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const getMcpConfigMock = vi.mocked(getMcpConfig);

const REQUEST_ID = "a".repeat(43);
const USER_AUTH_PROVIDER_CONN = {
  id: "conn-1",
  user_id: "user-1",
} as UserAuthProviderConn;

const presentedRequest = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    client_id: "https://client.example.com/.well-known/mcp-client.json",
    redirect_uri: "https://client.example.com/callback",
    code_challenge: "challenge",
    scopes: ["autodroid:read", "autodroid:write", "autodroid:admin"],
    resource: "https://api.autodroid.example/mcp",
    presented_at: 1700000000000,
    ...overrides,
  });

const grantRepositoryFindOne = vi.fn();
const MCP_AUTHORIZATION_GRANT_REPOSITORY_MOCK = {
  findOne: grantRepositoryFindOne,
} as unknown as Mocked<IMcpAuthorizationGrantRepository>;

describe("Service: McpAuthorizationRequestDecideService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;
  let delMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationRequestDecideService;

  beforeEach(() => {
    getMcpConfigMock.mockReturnValue({
      issuer: "https://api.autodroid.example",
      resource: "https://api.autodroid.example/mcp",
      resourceName: "AutoDroid",
      protectedResourceMetadataUrl:
        "https://api.autodroid.example/.well-known/oauth-protected-resource/mcp",
      authorizationEndpoint: "https://api.autodroid.example/oauth/authorize",
      tokenEndpoint: "https://api.autodroid.example/oauth/token",
      registrationEndpoint: "https://api.autodroid.example/oauth/register",
      revocationEndpoint: "https://api.autodroid.example/oauth/revoke",
      consentUrl: "https://app.autodroid.example/mcp/authorize",
      clientIdSecret: "test-secret",
    });

    getMock = vi.fn(async (key: string) =>
      key.startsWith("mcp-oauth:request:") ? presentedRequest() : null,
    );
    setMock = vi.fn().mockResolvedValue("OK");
    delMock = vi.fn().mockResolvedValue(1);

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock, set: setMock, del: delMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    grantRepositoryFindOne.mockResolvedValue(null);

    service = new McpAuthorizationRequestDecideService(
      inMemoryDatabaseProviderMock,
      MCP_AUTHORIZATION_GRANT_REPOSITORY_MOCK,
    );
  });

  it("should throw a 404 when the request does not exist", async () => {
    getMock.mockResolvedValueOnce(null);

    await expect(
      service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_request_decide_service/REQUEST_NOT_FOUND",
        statusCode: 404,
      }),
    );
  });

  it("should throw a 409 when the request's details were never presented", async () => {
    getMock.mockResolvedValueOnce(
      presentedRequest({ presented_at: undefined }),
    );

    await expect(
      service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_request_decide_service/REQUEST_NOT_PRESENTED",
        statusCode: 409,
      }),
    );
  });

  describe("deny", () => {
    it("should delete the request and redirect with access_denied", async () => {
      const result = await service.execute({
        request_id: REQUEST_ID,
        approve: false,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      expect(delMock).toHaveBeenCalledWith(`mcp-oauth:request:${REQUEST_ID}`);
      expect(setMock).not.toHaveBeenCalled();
      expect(result.redirect_to).toBe(
        "https://client.example.com/callback?error=access_denied&iss=https%3A%2F%2Fapi.autodroid.example",
      );
    });

    it("should include state when the original request carried one", async () => {
      getMock.mockResolvedValueOnce(presentedRequest({ state: "xyz" }));

      const result = await service.execute({
        request_id: REQUEST_ID,
        approve: false,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      const redirectUrl = new URL(result.redirect_to);
      expect(redirectUrl.searchParams.get("state")).toBe("xyz");
      expect(redirectUrl.searchParams.get("error")).toBe("access_denied");
    });
  });

  describe("approve", () => {
    it("should mint a code, store it, delete the request, and redirect with the code", async () => {
      const result = await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      expect(setMock).toHaveBeenCalledTimes(1);
      const [codeKey, codeValue, expFlag, ttl] = setMock.mock.calls[0];
      expect(codeKey).toMatch(/^mcp-oauth:code:/);
      expect(JSON.parse(codeValue)).toEqual({
        client_id: "https://client.example.com/.well-known/mcp-client.json",
        redirect_uri: "https://client.example.com/callback",
        code_challenge: "challenge",
        resource: "https://api.autodroid.example/mcp",
        scopes: ["autodroid:read", "autodroid:write"],
        user_auth_provider_conn_id: "conn-1",
        user_id: "user-1",
        sessions_epoch: 0,
        grant_token_generation: 0,
      });
      expect(expFlag).toBe("EX");
      expect(ttl).toBe(60);

      expect(delMock).toHaveBeenCalledWith(`mcp-oauth:request:${REQUEST_ID}`);

      const redirectUrl = new URL(result.redirect_to);
      expect(redirectUrl.origin + redirectUrl.pathname).toBe(
        "https://client.example.com/callback",
      );
      expect(redirectUrl.searchParams.get("code")).toMatch(
        /^[A-Za-z0-9_-]{43}$/,
      );
      expect(redirectUrl.searchParams.get("iss")).toBe(
        "https://api.autodroid.example",
      );
    });

    it("should record the user's current sessions epoch in the code, so a later sign-out everywhere can void it", async () => {
      getMock.mockImplementation(async (key: string) =>
        key.startsWith("mcp-oauth:request:")
          ? presentedRequest()
          : key === "mcp-oauth:sessions-epoch:user-1"
            ? "3"
            : null,
      );

      await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      expect(JSON.parse(setMock.mock.calls[0][1]).sessions_epoch).toBe(3);
    });

    it("should record the token generation of the user's existing connection to this client, so a later revoke can void the code", async () => {
      grantRepositoryFindOne.mockResolvedValueOnce({ token_generation: 4 });

      await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      expect(grantRepositoryFindOne).toHaveBeenCalledExactlyOnceWith({
        user_id: "user-1",
        client_id: "https://client.example.com/.well-known/mcp-client.json",
        resource: "https://api.autodroid.example/mcp",
      });
      expect(JSON.parse(setMock.mock.calls[0][1]).grant_token_generation).toBe(
        4,
      );
    });

    it("should store the code keyed by its own sha256 hash, not the raw code", async () => {
      const result = await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      const code = new URL(result.redirect_to).searchParams.get("code")!;
      const expectedHash = createHash("sha256")
        .update(code)
        .digest("base64url");

      expect(setMock).toHaveBeenCalledWith(
        `mcp-oauth:code:${expectedHash}`,
        expect.any(String),
        "EX",
        60,
      );
    });

    it.each([
      [
        "an administrator",
        true,
        ["autodroid:read", "autodroid:write", "autodroid:admin"],
      ],
      ["a regular user", false, ["autodroid:read", "autodroid:write"]],
    ])(
      "should put the scopes %s may hold into the code record",
      async (_label, isAdmin, expectedScopes) => {
        await service.execute({
          request_id: REQUEST_ID,
          approve: true,
          is_admin: isAdmin,
          user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
        });

        const [, codeValue] = setMock.mock.calls[0];
        expect(JSON.parse(codeValue).scopes).toEqual(expectedScopes);
      },
    );

    it("should answer invalid_scope, storing no code, when nothing the client asked for may be granted", async () => {
      getMock.mockResolvedValueOnce(
        presentedRequest({ scopes: ["autodroid:admin"] }),
      );

      const result = await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      const redirectUrl = new URL(result.redirect_to);
      expect(redirectUrl.searchParams.get("error")).toBe("invalid_scope");
      expect(redirectUrl.searchParams.get("code")).toBeNull();
      expect(setMock).not.toHaveBeenCalled();
      expect(delMock).toHaveBeenCalledWith(`mcp-oauth:request:${REQUEST_ID}`);
    });

    it("should carry the stored request's resource forward into the code record", async () => {
      getMock.mockResolvedValueOnce(
        presentedRequest({ resource: "https://api.autodroid.example/mcp" }),
      );

      await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      const [, codeValue] = setMock.mock.calls[0];
      expect(JSON.parse(codeValue).resource).toBe(
        "https://api.autodroid.example/mcp",
      );
    });

    it("should include state in the success redirect when the original request carried one", async () => {
      getMock.mockResolvedValueOnce(presentedRequest({ state: "xyz" }));

      const result = await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      expect(new URL(result.redirect_to).searchParams.get("state")).toBe("xyz");
    });

    it("should throw a 404, storing no code, when a concurrent decision already claimed the request", async () => {
      delMock.mockResolvedValueOnce(0);

      await expect(
        service.execute({
          request_id: REQUEST_ID,
          approve: true,
          is_admin: false,
          user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@mcp_authorization_request_decide_service/REQUEST_NOT_FOUND",
          statusCode: 404,
        }),
      );
      expect(delMock).toHaveBeenCalledExactlyOnceWith(
        `mcp-oauth:request:${REQUEST_ID}`,
      );
      expect(setMock).not.toHaveBeenCalled();
    });

    it("should claim the request before storing the code", async () => {
      const callOrder: string[] = [];
      setMock.mockImplementation(async () => {
        callOrder.push("set");
        return "OK";
      });
      delMock.mockImplementation(async () => {
        callOrder.push("del");
        return 1;
      });

      await service.execute({
        request_id: REQUEST_ID,
        approve: true,
        is_admin: false,
        user_auth_provider_conn: USER_AUTH_PROVIDER_CONN,
      });

      expect(callOrder).toEqual(["del", "set"]);
    });
  });
});
