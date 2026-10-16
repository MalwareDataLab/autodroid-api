import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { ssrfSafeJsonFetch } from "@shared/utils/ssrfSafeJsonFetch";

// Constant import
import { MCP_DEFAULT_SCOPES } from "../constants/mcpAuthorization.constant";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { McpAuthorizationClientRegisterService } from "./mcpAuthorizationClientRegister.service";
import { McpAuthorizationClientResolveService } from "./mcpAuthorizationClientResolve.service";
import { McpAuthorizationRequestCreateService } from "./mcpAuthorizationRequestCreate.service";
import { McpAuthorizationRequestDecideService } from "./mcpAuthorizationRequestDecide.service";
import { McpAuthorizationRequestShowService } from "./mcpAuthorizationRequestShow.service";
import { UserMcpAuthorizationGrantIndexService } from "./userMcpAuthorizationGrantIndex.service";
import { UserMcpAuthorizationGrantRevokeService } from "./userMcpAuthorizationGrantRevoke.service";

// Target import
import { McpAuthorizationCodeExchangeService } from "./mcpAuthorizationCodeExchange.service";

vi.mock("@shared/utils/ssrfSafeJsonFetch", () => ({
  ssrfSafeJsonFetch: vi.fn(),
}));

const CIMD_CLIENT_ID = "https://agent.example.com:8443/oauth/client.json";
const CIMD_REDIRECT_URI = "http://127.0.0.1:43117/callback";

describe("Service: McpAuthorizationCodeExchangeService", () => {
  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;
  let mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository;

  const resolveClient = async (client_id: string) =>
    (await new McpAuthorizationClientResolveService(
      inMemoryDatabaseProvider,
    ).execute({ client_id })) as OAuthClientInformationFull;

  const approve = async (
    client: OAuthClientInformationFull,
    redirectUri: string,
    user_id: string,
  ) => {
    const consentUrl = await new McpAuthorizationRequestCreateService(
      inMemoryDatabaseProvider,
    ).execute({
      client,
      params: { codeChallenge: "challenge", redirectUri },
    });
    const request_id = new URL(consentUrl).searchParams.get(
      "request_id",
    ) as string;
    await new McpAuthorizationRequestShowService(
      inMemoryDatabaseProvider,
    ).execute({ request_id, is_admin: false });
    const { redirect_to } = await new McpAuthorizationRequestDecideService(
      inMemoryDatabaseProvider,
      mcpAuthorizationGrantRepository,
    ).execute({
      request_id,
      approve: true,
      is_admin: false,
      user_auth_provider_conn: {
        id: "conn-1",
        user_id,
      } as UserAuthProviderConn,
    });

    return new URL(redirect_to).searchParams.get("code") as string;
  };

  const exchange = (
    client: OAuthClientInformationFull,
    redirectUri: string,
    authorizationCode: string,
  ) =>
    new McpAuthorizationCodeExchangeService(
      inMemoryDatabaseProvider,
      mcpAuthorizationGrantRepository,
    ).execute({ client, authorizationCode, redirectUri });

  const authorizeAndExchange = async (
    client: OAuthClientInformationFull,
    redirectUri: string,
    user_id: string,
  ) =>
    exchange(client, redirectUri, await approve(client, redirectUri, user_id));

  const revokeConnection = (user_id: string, grant_id: string) =>
    new UserMcpAuthorizationGrantRevokeService(
      mcpAuthorizationGrantRepository,
    ).execute({ user_id, grant_id, language: "en" });

  const listConnections = (user_id: string) =>
    new UserMcpAuthorizationGrantIndexService(
      mcpAuthorizationGrantRepository,
    ).execute({ user_id });

  beforeEach(() => {
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");
    mcpAuthorizationGrantRepository = container.resolve(
      "McpAuthorizationGrantRepository",
    );
    vi.mocked(ssrfSafeJsonFetch).mockResolvedValue({
      body: {
        client_id: CIMD_CLIENT_ID,
        client_name: "Example Agent",
        redirect_uris: [CIMD_REDIRECT_URI],
        token_endpoint_auth_method: "none",
      },
      headers: {},
    } as Awaited<ReturnType<typeof ssrfSafeJsonFetch>>);
  });

  it("should turn a metadata-document client's approved code into tokens and one connection vouched for by the document's host", async () => {
    const { id: user_id } = await userFactory.create();
    const client = await resolveClient(CIMD_CLIENT_ID);

    const tokens = await authorizeAndExchange(
      client,
      CIMD_REDIRECT_URI,
      user_id,
    );

    expect(ssrfSafeJsonFetch).toHaveBeenCalledExactlyOnceWith(
      CIMD_CLIENT_ID,
      expect.any(Object),
    );
    expect(tokens).toEqual({
      access_token: expect.any(String),
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: expect.any(String),
      scope: MCP_DEFAULT_SCOPES.join(" "),
    });
    await expect(listConnections(user_id)).resolves.toEqual([
      expect.objectContaining({
        user_id,
        client_id: CIMD_CLIENT_ID,
        client_name: "Example Agent",
        client_verified_host: "agent.example.com:8443",
        resource: getMcpConfig().resource,
        scopes: MCP_DEFAULT_SCOPES,
        revoked_at: null,
      }),
    ]);
  });

  it("should keep one connection when the same metadata-document client authorizes again", async () => {
    const { id: user_id } = await userFactory.create();
    const client = await resolveClient(CIMD_CLIENT_ID);
    await authorizeAndExchange(client, CIMD_REDIRECT_URI, user_id);
    const [first] = await listConnections(user_id);

    await authorizeAndExchange(
      await resolveClient(CIMD_CLIENT_ID),
      "http://127.0.0.1:51999/callback",
      user_id,
    );

    await expect(listConnections(user_id)).resolves.toEqual([
      expect.objectContaining({
        id: first.id,
        client_verified_host: "agent.example.com:8443",
      }),
    ]);
  });

  it("should give a dynamically registered client the same client_id when it registers the same metadata again, so its re-authorization keeps one connection", async () => {
    const { id: user_id } = await userFactory.create();
    const registerService = new McpAuthorizationClientRegisterService();
    vi.useFakeTimers({ toFake: ["Date"] });
    const firstRegistration = registerService.execute({
      redirect_uris: ["http://localhost:33418/callback"],
      client_name: "Example Agent",
    });
    vi.setSystemTime(Date.now() + 60 * 60 * 1000);
    const secondRegistration = registerService.execute({
      redirect_uris: ["http://localhost:47021/callback"],
      client_name: "Example Agent",
    });
    vi.useRealTimers();

    await authorizeAndExchange(
      await resolveClient(firstRegistration.client_id),
      "http://localhost:33418/callback",
      user_id,
    );
    await authorizeAndExchange(
      await resolveClient(secondRegistration.client_id),
      "http://localhost:47021/callback",
      user_id,
    );

    expect(secondRegistration.client_id).toBe(firstRegistration.client_id);
    await expect(listConnections(user_id)).resolves.toEqual([
      expect.objectContaining({
        client_id: firstRegistration.client_id,
        client_name: "Example Agent",
        client_verified_host: null,
      }),
    ]);
  });

  it("should refuse a code approved before the user revoked the connection, without bringing the connection back", async () => {
    const { id: user_id } = await userFactory.create();
    const client = await resolveClient(CIMD_CLIENT_ID);
    await authorizeAndExchange(client, CIMD_REDIRECT_URI, user_id);
    const [connection] = await listConnections(user_id);
    const authorizationCode = await approve(client, CIMD_REDIRECT_URI, user_id);
    await revokeConnection(user_id, connection.id);

    await expect(
      exchange(client, CIMD_REDIRECT_URI, authorizationCode),
    ).rejects.toMatchObject({
      key: "@mcp_authorization_code_exchange_service/CONNECTION_REVOKED",
      statusCode: 400,
    });

    await expect(listConnections(user_id)).resolves.toEqual([]);
    await expect(
      mcpAuthorizationGrantRepository.findOne({ id: connection.id }),
    ).resolves.toMatchObject({
      revoked_at: expect.any(Date),
      token_generation: connection.token_generation + 1,
    });
    await expect(
      exchange(client, CIMD_REDIRECT_URI, authorizationCode),
    ).rejects.toMatchObject({
      key: "@mcp_authorization_code_exchange_service/CODE_NOT_FOUND",
    });
  });

  it("should let the user re-authorize a revoked connection with a new code, bringing it back under the same id", async () => {
    const { id: user_id } = await userFactory.create();
    const client = await resolveClient(CIMD_CLIENT_ID);
    await authorizeAndExchange(client, CIMD_REDIRECT_URI, user_id);
    const [connection] = await listConnections(user_id);
    await revokeConnection(user_id, connection.id);

    const tokens = await authorizeAndExchange(
      client,
      CIMD_REDIRECT_URI,
      user_id,
    );

    expect(tokens.access_token).toEqual(expect.any(String));
    await expect(listConnections(user_id)).resolves.toEqual([
      expect.objectContaining({
        id: connection.id,
        revoked_at: null,
        token_generation: connection.token_generation + 1,
      }),
    ]);
  });

  it("should authorize a second client after the user revoked another client's connection", async () => {
    const { id: user_id } = await userFactory.create();
    const revokedClient = await resolveClient(CIMD_CLIENT_ID);
    await authorizeAndExchange(revokedClient, CIMD_REDIRECT_URI, user_id);
    const [revokedConnection] = await listConnections(user_id);
    await revokeConnection(user_id, revokedConnection.id);
    const { client_id } = new McpAuthorizationClientRegisterService().execute({
      redirect_uris: ["http://localhost:33418/callback"],
      client_name: "Second Agent",
    });

    const tokens = await authorizeAndExchange(
      await resolveClient(client_id),
      "http://localhost:33418/callback",
      user_id,
    );

    expect(tokens.access_token).toEqual(expect.any(String));
    await expect(listConnections(user_id)).resolves.toEqual([
      expect.objectContaining({
        client_id,
        revoked_at: null,
        token_generation: 0,
      }),
    ]);
  });
});
