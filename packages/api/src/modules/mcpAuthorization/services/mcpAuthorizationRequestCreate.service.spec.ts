import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import { McpAuthorizationRequestCreateService } from "./mcpAuthorizationRequestCreate.service";

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const getMcpConfigMock = vi.mocked(getMcpConfig);

const MCP_CONFIG = {
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
};

const CLIENT = {
  client_id: "https://client.example.com/.well-known/mcp-client.json",
  redirect_uris: ["https://client.example.com/callback"],
  client_name: "Example MCP Client",
  token_endpoint_auth_method: "none",
};

const DCR_CLIENT = {
  ...CLIENT,
  client_id: "mcpc1.abc.def",
};

describe("Service: McpAuthorizationRequestCreateService", () => {
  let setMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationRequestCreateService;

  beforeEach(() => {
    vi.clearAllMocks();
    getMcpConfigMock.mockReturnValue(MCP_CONFIG);

    setMock = vi.fn().mockResolvedValue("OK");
    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { set: setMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationRequestCreateService(
      inMemoryDatabaseProviderMock,
    );
  });

  it("should store the pending request and return the consent URL with a request_id", async () => {
    const url = await service.execute({
      client: CLIENT,
      params: {
        codeChallenge: "challenge",
        redirectUri: "https://client.example.com/callback",
      },
    });

    expect(url).toMatch(
      /^https:\/\/app\.autodroid\.example\/mcp\/authorize\?request_id=[A-Za-z0-9_-]{43}$/,
    );

    expect(setMock).toHaveBeenCalledTimes(1);
    const [key, value, expFlag, ttl] = setMock.mock.calls[0];
    expect(key).toMatch(/^mcp-oauth:request:/);
    expect(JSON.parse(value)).toEqual({
      client_id: CLIENT.client_id,
      client_kind: "cimd",
      client_name: "Example MCP Client",
      redirect_uris: CLIENT.redirect_uris,
      redirect_uri: "https://client.example.com/callback",
      code_challenge: "challenge",
      scopes: ["autodroid:read", "autodroid:write"],
      resource: "https://api.autodroid.example/mcp",
    });
    expect(expFlag).toBe("EX");
    expect(ttl).toBe(600);
  });

  it("should mark the client_kind as dcr for an HMAC-signed client_id", async () => {
    await service.execute({
      client: DCR_CLIENT,
      params: {
        codeChallenge: "challenge",
        redirectUri: "https://client.example.com/callback",
      },
    });

    const [, value] = setMock.mock.calls[0];
    expect(JSON.parse(value).client_kind).toBe("dcr");
  });

  it("should include state, scopes and resource when given", async () => {
    await service.execute({
      client: CLIENT,
      params: {
        codeChallenge: "challenge",
        redirectUri: "https://client.example.com/callback",
        state: "xyz",
        scopes: ["autodroid:admin", "autodroid:read"],
        resource: new URL("https://api.autodroid.example/mcp"),
      },
    });

    const [, value] = setMock.mock.calls[0];
    const parsed = JSON.parse(value);
    expect(parsed.state).toBe("xyz");
    expect(parsed.scopes).toEqual(["autodroid:read", "autodroid:admin"]);
    expect(parsed.resource).toBe("https://api.autodroid.example/mcp");
  });

  it("should refuse a request for a scope the server does not know, before storing anything", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        params: {
          codeChallenge: "challenge",
          redirectUri: "https://client.example.com/callback",
          scopes: ["autodroid:read", "openid"],
        },
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_scopes/INVALID_SCOPE",
        message: "Unknown scope: openid.",
      }),
    );

    expect(setMock).not.toHaveBeenCalled();
  });

  it("should bind the request to this server's own resource when the client sent none", async () => {
    await service.execute({
      client: CLIENT,
      params: {
        codeChallenge: "challenge",
        redirectUri: "https://client.example.com/callback",
      },
    });

    const [, value] = setMock.mock.calls[0];
    expect(JSON.parse(value).resource).toBe(
      "https://api.autodroid.example/mcp",
    );
  });

  it("should reject a resource that does not match this server", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        params: {
          codeChallenge: "challenge",
          redirectUri: "https://client.example.com/callback",
          resource: new URL("https://other-server.example.com/mcp"),
        },
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_request_create_service/INVALID_RESOURCE",
        statusCode: 400,
      }),
    );
    expect(setMock).not.toHaveBeenCalled();
  });
});
