import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { PrismaClient } from "@prisma/client";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import {
  MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX,
  MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX,
  MCP_DEFAULT_SCOPES,
} from "../constants/mcpAuthorization.constant";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Repository import
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { UserSessionsCloseService } from "@modules/user/services/userSessionsClose.service";
import { McpAuthorizationAccessTokenVerifyService } from "./mcpAuthorizationAccessTokenVerify.service";
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";
import { McpAuthorizationTokenRefreshService } from "./mcpAuthorizationTokenRefresh.service";
import { UserMcpAuthorizationGrantIndexService } from "./userMcpAuthorizationGrantIndex.service";

// Target import
import { UserMcpAuthorizationGrantRevokeService } from "./userMcpAuthorizationGrantRevoke.service";

const INVALID_GRANT = expect.objectContaining({
  key: "@mcp_authorization_token_refresh_service/INVALID_GRANT",
  statusCode: 400,
});
const INVALID_TOKEN = expect.objectContaining({
  key: "@mcp_authorization_access_token_verify_service/TOKEN_NOT_FOUND",
  statusCode: 401,
});
const NOT_FOUND = expect.objectContaining({
  key: "@user_mcp_authorization_grant_revoke_service/GRANT_NOT_FOUND",
  message: "Connection not found.",
  statusCode: 404,
});

describe("Service: UserMcpAuthorizationGrantRevokeService", () => {
  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;
  let userAuthProviderConnRepository: IUserAuthProviderConnRepository;
  let mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository;
  let prisma: PrismaClient;

  let tokenIssueService: McpAuthorizationTokenIssueService;
  let verifyService: McpAuthorizationAccessTokenVerifyService;
  let refreshService: McpAuthorizationTokenRefreshService;
  let indexService: UserMcpAuthorizationGrantIndexService;
  let revokeService: UserMcpAuthorizationGrantRevokeService;

  const client = { client_id: "mcpc1.mine" } as OAuthClientInformationFull;

  const connectUser = async () => {
    const user = await userFactory.create();
    const conn = await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: `code-${user.id}`,
    });
    return { user, conn };
  };

  const authorize = async (
    connected: {
      user: { id: string };
      conn: { id: string };
    },
    client_id: string = client.client_id,
  ) => {
    const tokens = await tokenIssueService.execute({
      client_id,
      user_auth_provider_conn_id: connected.conn.id,
      scopes: MCP_DEFAULT_SCOPES,
      resource: getMcpConfig().resource,
      user_id: connected.user.id,
      client_name: "Example Agent",
    });
    const accessKey = `${MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX}${hashBase64Url(tokens.access_token)}`;
    const record = JSON.parse(
      (await inMemoryDatabaseProvider.connection.get(accessKey)) as string,
    );
    return { tokens, grant_id: record.grant_id as string };
  };

  const refresh = (refreshToken: string) =>
    refreshService.execute({ client, refreshToken });

  beforeEach(() => {
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");
    userAuthProviderConnRepository = container.resolve(
      "UserAuthProviderConnRepository",
    );
    mcpAuthorizationGrantRepository = container.resolve(
      "McpAuthorizationGrantRepository",
    );
    prisma = container.resolve<{ client: PrismaClient }>(
      "DatabaseProvider",
    ).client;

    tokenIssueService = new McpAuthorizationTokenIssueService(
      inMemoryDatabaseProvider,
      mcpAuthorizationGrantRepository,
    );
    verifyService = new McpAuthorizationAccessTokenVerifyService(
      inMemoryDatabaseProvider,
      userAuthProviderConnRepository,
      mcpAuthorizationGrantRepository,
    );
    refreshService = new McpAuthorizationTokenRefreshService(
      inMemoryDatabaseProvider,
      mcpAuthorizationGrantRepository,
    );
    indexService = new UserMcpAuthorizationGrantIndexService(
      mcpAuthorizationGrantRepository,
    );
    revokeService = new UserMcpAuthorizationGrantRevokeService(
      mcpAuthorizationGrantRepository,
    );
  });

  it("should cut a live access token and refresh at once when the user revokes the grant, and keep the row as the record of it", async () => {
    const connected = await connectUser();
    const { tokens, grant_id } = await authorize(connected);
    await expect(
      verifyService.execute({ token: tokens.access_token }),
    ).resolves.toMatchObject({ clientId: client.client_id });

    const revoked = await revokeService.execute({
      user_id: connected.user.id,
      grant_id,
      language: "en",
    });

    expect(revoked).toEqual(
      expect.objectContaining({
        id: grant_id,
        client_name: "Example Agent",
        revoked_at: expect.any(Date),
      }),
    );
    await expect(
      verifyService.execute({ token: tokens.access_token }),
    ).rejects.toThrowError(INVALID_TOKEN);
    await expect(refresh(tokens.refresh_token as string)).rejects.toThrowError(
      INVALID_GRANT,
    );
    await expect(
      indexService.execute({ user_id: connected.user.id }),
    ).resolves.toEqual([]);
    await expect(
      prisma.mcpAuthorizationGrant.findUnique({ where: { id: grant_id } }),
    ).resolves.toEqual(
      expect.objectContaining({ revoked_at: revoked.revoked_at }),
    );
  });

  it("should keep rejecting a revoked grant's tokens after a Redis restore writes them back", async () => {
    const connected = await connectUser();
    const { tokens, grant_id } = await authorize(connected);
    const { connection } = inMemoryDatabaseProvider;
    const accessKey = `${MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX}${hashBase64Url(tokens.access_token)}`;
    const refreshKey = `${MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX}${hashBase64Url(tokens.refresh_token as string)}`;
    const snapshot = {
      access: (await connection.get(accessKey)) as string,
      refresh: (await connection.get(refreshKey)) as string,
    };

    await revokeService.execute({
      user_id: connected.user.id,
      grant_id,
      language: "en",
    });
    await connection.del(accessKey, refreshKey);
    await connection.set(accessKey, snapshot.access, "EX", 3600);
    await connection.set(refreshKey, snapshot.refresh, "EX", 3600);

    await expect(
      verifyService.execute({ token: tokens.access_token }),
    ).rejects.toThrowError(INVALID_TOKEN);
    await expect(refresh(tokens.refresh_token as string)).rejects.toThrowError(
      INVALID_GRANT,
    );
    expect(await connection.get(refreshKey)).toBe(snapshot.refresh);
  });

  it("should stop a grant past its absolute lifetime from verifying, refreshing, or being listed and revoked", async () => {
    const connected = await connectUser();
    const { tokens, grant_id } = await authorize(connected);
    await prisma.mcpAuthorizationGrant.update({
      where: { id: grant_id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });

    await expect(
      verifyService.execute({ token: tokens.access_token }),
    ).rejects.toThrowError(INVALID_TOKEN);
    await expect(refresh(tokens.refresh_token as string)).rejects.toThrowError(
      INVALID_GRANT,
    );
    await expect(
      indexService.execute({ user_id: connected.user.id }),
    ).resolves.toEqual([]);
    await expect(
      revokeService.execute({
        user_id: connected.user.id,
        grant_id,
        language: "en",
      }),
    ).rejects.toThrowError(NOT_FOUND);
  });

  it("should answer a second revocation of the same grant as not found, keeping the first revoked_at", async () => {
    const connected = await connectUser();
    const { grant_id } = await authorize(connected);
    const first = await revokeService.execute({
      user_id: connected.user.id,
      grant_id,
      language: "en",
    });

    await expect(
      revokeService.execute({
        user_id: connected.user.id,
        grant_id,
        language: "en",
      }),
    ).rejects.toThrowError(NOT_FOUND);
    await expect(
      prisma.mcpAuthorizationGrant.findUnique({ where: { id: grant_id } }),
    ).resolves.toEqual(
      expect.objectContaining({ revoked_at: first.revoked_at }),
    );
  });

  it("should answer a grant id that never existed as not found", async () => {
    const connected = await connectUser();

    await expect(
      revokeService.execute({
        user_id: connected.user.id,
        grant_id: "does-not-exist",
        language: "en",
      }),
    ).rejects.toThrowError(NOT_FOUND);
  });

  it("should leave another user's grant and tokens working when a user tries to revoke it", async () => {
    const owner = await connectUser();
    const attacker = await connectUser();
    const { tokens, grant_id } = await authorize(owner);

    await expect(
      revokeService.execute({
        user_id: attacker.user.id,
        grant_id,
        language: "en",
      }),
    ).rejects.toThrowError(NOT_FOUND);

    await expect(
      verifyService.execute({ token: tokens.access_token }),
    ).resolves.toMatchObject({ clientId: client.client_id });
    await expect(
      prisma.mcpAuthorizationGrant.findUnique({ where: { id: grant_id } }),
    ).resolves.toEqual(expect.objectContaining({ revoked_at: null }));
  });

  it("should list and revoke a grant that sorts past the 100th", async () => {
    const connected = await connectUser();
    const oldest = await authorize(connected);
    await prisma.mcpAuthorizationGrant.update({
      where: { id: oldest.grant_id },
      data: { created_at: new Date(Date.now() - 60 * 60 * 1000) },
    });
    await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        authorize(connected, `mcpc1.agent-${index}`),
      ),
    );

    const listed = await indexService.execute({ user_id: connected.user.id });
    expect(listed).toHaveLength(101);
    expect(listed[100].id).toBe(oldest.grant_id);

    await revokeService.execute({
      user_id: connected.user.id,
      grant_id: oldest.grant_id,
      language: "en",
    });

    await expect(
      verifyService.execute({ token: oldest.tokens.access_token }),
    ).rejects.toThrowError(INVALID_TOKEN);
    const after = await indexService.execute({ user_id: connected.user.id });
    expect(after).toHaveLength(100);
    expect(after.map(grant => grant.id)).not.toContain(oldest.grant_id);
  });

  it("should cut every MCP connection's tokens when the user closes all sessions", async () => {
    const connected = await connectUser();
    const other = await connectUser();
    const first = await authorize(connected);
    const second = await authorize(connected);
    const othersGrant = await authorize(other);

    await container
      .resolve(UserSessionsCloseService)
      .execute({ user: connected.user, language: "en" });

    await Promise.all(
      [first, second].map(async ({ tokens }) => {
        await expect(
          verifyService.execute({ token: tokens.access_token }),
        ).rejects.toThrowError(INVALID_TOKEN);
        await expect(
          refresh(tokens.refresh_token as string),
        ).rejects.toThrowError(INVALID_GRANT);
      }),
    );
    await expect(
      verifyService.execute({ token: othersGrant.tokens.access_token }),
    ).resolves.toMatchObject({ clientId: client.client_id });
  });
});
