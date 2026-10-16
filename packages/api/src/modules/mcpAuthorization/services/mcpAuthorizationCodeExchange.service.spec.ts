import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Service import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";

// Target import
import { McpAuthorizationCodeExchangeService } from "./mcpAuthorizationCodeExchange.service";

const tokenIssueExecuteMock = vi.fn();
vi.mock("./mcpAuthorizationTokenIssue.service", () => ({
  McpAuthorizationTokenIssueService: vi.fn(() => ({
    execute: tokenIssueExecuteMock,
  })),
}));

const AUTHORIZATION_CODE = "the-authorization-code";
const CODE_HASH = createHash("sha256")
  .update(AUTHORIZATION_CODE)
  .digest("base64url");

vi.mock("@config/mcp", () => ({ getMcpConfig: vi.fn() }));

const MCP_RESOURCE = "https://api.autodroid.example/mcp";

const CLIENT = {
  client_id: "mcpc1.abc.def",
  client_name: "Example Agent",
} as any;

const codeRecord = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    client_id: "mcpc1.abc.def",
    redirect_uri: "https://client.example.com/callback",
    code_challenge: "the-challenge",
    user_auth_provider_conn_id: "conn-1",
    user_id: "user-1",
    resource: MCP_RESOURCE,
    scopes: ["autodroid:read"],
    sessions_epoch: 0,
    grant_token_generation: 0,
    ...overrides,
  });

const grantRepositoryUpdateMany = vi.fn();
const grantRepositoryFindOne = vi.fn();
const MCP_AUTHORIZATION_GRANT_REPOSITORY_MOCK = {
  updateMany: grantRepositoryUpdateMany,
  findOne: grantRepositoryFindOne,
} as unknown as Mocked<IMcpAuthorizationGrantRepository>;

describe("Service: McpAuthorizationCodeExchangeService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let delMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationCodeExchangeService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMcpConfig).mockReturnValue({
      resource: MCP_RESOURCE,
    } as ReturnType<typeof getMcpConfig>);

    getMock = vi.fn(async (key: string) =>
      key.startsWith("mcp-oauth:code:") ? codeRecord() : null,
    );
    delMock = vi.fn().mockResolvedValue(1);

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock, del: delMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationCodeExchangeService(
      inMemoryDatabaseProviderMock,
      MCP_AUTHORIZATION_GRANT_REPOSITORY_MOCK,
    );

    grantRepositoryFindOne.mockResolvedValue(null);

    tokenIssueExecuteMock.mockResolvedValue({
      access_token: "at",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "rt",
    });
  });

  it("should consume the code and mint tokens on a matching exchange", async () => {
    const result = await service.execute({
      client: CLIENT,
      authorizationCode: AUTHORIZATION_CODE,
      redirectUri: "https://client.example.com/callback",
    });

    expect(getMock).toHaveBeenCalledWith(`mcp-oauth:code:${CODE_HASH}`);
    expect(delMock).toHaveBeenCalledWith(`mcp-oauth:code:${CODE_HASH}`);
    expect(McpAuthorizationTokenIssueService).toHaveBeenCalledWith(
      inMemoryDatabaseProviderMock,
      MCP_AUTHORIZATION_GRANT_REPOSITORY_MOCK,
    );
    expect(tokenIssueExecuteMock).toHaveBeenCalledWith({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      resource: MCP_RESOURCE,
      scopes: ["autodroid:read"],
      user_id: "user-1",
      client_name: "Example Agent",
    });
    expect(result).toEqual({
      access_token: "at",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "rt",
    });
  });

  it("should succeed without a redirect_uri when the token request omits it", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).resolves.toBeDefined();
  });

  it("should carry the matching resource forward into token issuance", async () => {
    getMock.mockResolvedValueOnce(
      codeRecord({ resource: "https://api.autodroid.example/mcp" }),
    );

    await service.execute({
      client: CLIENT,
      authorizationCode: AUTHORIZATION_CODE,
      resource: new URL("https://api.autodroid.example/mcp"),
    });

    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "https://api.autodroid.example/mcp",
      }),
    );
  });

  it("should throw when the code does not exist", async () => {
    getMock.mockResolvedValueOnce(null);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CODE_NOT_FOUND",
        statusCode: 400,
      }),
    );
  });

  const withEpoch = (codeEpoch: number, current: string[]) => {
    const reads = [...current];
    getMock.mockImplementation(async (key: string) =>
      key.startsWith("mcp-oauth:code:")
        ? codeRecord({ sessions_epoch: codeEpoch })
        : (reads.shift() ?? null),
    );
  };

  it("should read the user's sessions epoch after the code", async () => {
    await service.execute({
      client: CLIENT,
      authorizationCode: AUTHORIZATION_CODE,
    });

    expect(getMock).toHaveBeenCalledWith("mcp-oauth:sessions-epoch:user-1");
  });

  it("should reject, and consume, a code approved in an earlier sessions epoch", async () => {
    withEpoch(2, ["3"]);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CODE_REVOKED",
        statusCode: 400,
      }),
    );
    expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
    expect(delMock).toHaveBeenCalledWith(`mcp-oauth:code:${CODE_HASH}`);
  });

  it("should accept a code approved in the user's current sessions epoch", async () => {
    withEpoch(3, ["3", "3"]);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).resolves.toBeDefined();
    expect(grantRepositoryUpdateMany).not.toHaveBeenCalled();
  });

  it("should revoke the grant it just minted when the user closed every session while the exchange was running", async () => {
    withEpoch(3, ["3", "4"]);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CODE_REVOKED",
      }),
    );
    expect(grantRepositoryUpdateMany).toHaveBeenCalledWith(
      { user_id: "user-1", active: true },
      { revoked_at: expect.any(Date) },
    );
  });

  it("should throw when the code was issued to a different client", async () => {
    await expect(
      service.execute({
        client: { client_id: "mcpc1.other.client" } as any,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CODE_CLIENT_MISMATCH",
        statusCode: 400,
      }),
    );
  });

  it("should throw when redirect_uri does not match the one used to authorize the code", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
        redirectUri: "https://attacker.example.com/callback",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/REDIRECT_URI_MISMATCH",
        statusCode: 400,
      }),
    );
  });

  it("should throw when resource is given but the code carries none", async () => {
    getMock.mockResolvedValueOnce(codeRecord({ resource: undefined }));

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
        resource: new URL("https://api.autodroid.example/mcp"),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/RESOURCE_MISMATCH",
        statusCode: 400,
      }),
    );
  });

  it("should treat an omitted resource as this server's own, since it serves exactly one", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).resolves.toBeDefined();
    expect(tokenIssueExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({ resource: MCP_RESOURCE }),
    );
  });

  it("should throw when the token request names a different resource than the code was issued for", async () => {
    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
        resource: new URL("https://other-server.example.com/mcp"),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/RESOURCE_MISMATCH",
        statusCode: 400,
      }),
    );
  });

  it("should throw when the code was already consumed by a concurrent request", async () => {
    delMock.mockResolvedValueOnce(0);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CODE_ALREADY_CONSUMED",
        statusCode: 400,
      }),
    );
  });

  const withGrantGenerations = (
    codeGeneration: number,
    generations: (number | null)[],
  ) => {
    getMock.mockImplementation(async (key: string) =>
      key.startsWith("mcp-oauth:code:")
        ? codeRecord({ grant_token_generation: codeGeneration })
        : null,
    );
    generations.forEach(token_generation =>
      grantRepositoryFindOne.mockResolvedValueOnce(
        token_generation === null ? null : { id: "grant-1", token_generation },
      ),
    );
  };

  it("should look the code's connection up by user, client and resource, revoked or not", async () => {
    await service.execute({
      client: CLIENT,
      authorizationCode: AUTHORIZATION_CODE,
    });

    expect(grantRepositoryFindOne).toHaveBeenCalledWith({
      user_id: "user-1",
      client_id: "mcpc1.abc.def",
      resource: MCP_RESOURCE,
    });
  });

  it("should reject, and consume, a code approved before its connection was revoked", async () => {
    withGrantGenerations(2, [3]);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CONNECTION_REVOKED",
        statusCode: 400,
      }),
    );
    expect(tokenIssueExecuteMock).not.toHaveBeenCalled();
    expect(delMock).toHaveBeenCalledExactlyOnceWith(
      `mcp-oauth:code:${CODE_HASH}`,
    );
    expect(grantRepositoryUpdateMany).not.toHaveBeenCalled();
  });

  it("should accept a code whose connection kept the generation seen at approval", async () => {
    withGrantGenerations(2, [2, 2]);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).resolves.toBeDefined();
    expect(grantRepositoryUpdateMany).not.toHaveBeenCalled();
  });

  it("should accept a code for a connection created after its approval and not revoked since", async () => {
    withGrantGenerations(0, [null, 0]);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).resolves.toBeDefined();
    expect(grantRepositoryUpdateMany).not.toHaveBeenCalled();
  });

  it("should revoke the connection it just brought back when the user revoked it while the exchange was running", async () => {
    withGrantGenerations(2, [2, 3]);

    await expect(
      service.execute({
        client: CLIENT,
        authorizationCode: AUTHORIZATION_CODE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_code_exchange_service/CONNECTION_REVOKED",
      }),
    );
    expect(tokenIssueExecuteMock).toHaveBeenCalledOnce();
    expect(grantRepositoryUpdateMany).toHaveBeenCalledExactlyOnceWith(
      { id: "grant-1", active: true },
      { revoked_at: expect.any(Date) },
    );
  });
});
