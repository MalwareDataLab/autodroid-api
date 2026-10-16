import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { PrismaClient } from "@prisma/client";
import { container } from "tsyringe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import {
  MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX,
  MCP_DEFAULT_SCOPES,
} from "../constants/mcpAuthorization.constant";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";

// Target import
import { McpAuthorizationTokenRefreshService } from "./mcpAuthorizationTokenRefresh.service";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("Service: McpAuthorizationTokenRefreshService", () => {
  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;
  let mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository;
  let service: McpAuthorizationTokenRefreshService;

  const client = { client_id: "mcpc1.mine" } as OAuthClientInformationFull;

  const issue = async (user_id?: string) =>
    new McpAuthorizationTokenIssueService(
      inMemoryDatabaseProvider,
      mcpAuthorizationGrantRepository,
    ).execute({
      client_id: client.client_id,
      user_auth_provider_conn_id: "conn-1",
      scopes: MCP_DEFAULT_SCOPES,
      resource: getMcpConfig().resource,
      user_id: user_id ?? (await userFactory.create()).id,
    });

  const revokedAtOf = async (grantId: string) =>
    (await mcpAuthorizationGrantRepository.findOne({ id: grantId }))
      ?.revoked_at;

  const grantIdOf = async (refreshToken: string) =>
    JSON.parse(
      (await inMemoryDatabaseProvider.connection.get(
        `${MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX}${hashBase64Url(refreshToken)}`,
      )) as string,
    ).grant_id as string;

  beforeEach(() => {
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");
    mcpAuthorizationGrantRepository = container.resolve(
      "McpAuthorizationGrantRepository",
    );
    service = new McpAuthorizationTokenRefreshService(
      inMemoryDatabaseProvider,
      mcpAuthorizationGrantRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should rotate a live grant's refresh token, carrying the grant forward without creating another", async () => {
    const tokens = await issue();
    const grantId = await grantIdOf(tokens.refresh_token as string);

    const rotated = await service.execute({
      client,
      refreshToken: tokens.refresh_token as string,
    });

    expect(await grantIdOf(rotated.refresh_token as string)).toBe(grantId);
    expect(await revokedAtOf(grantId)).toBeNull();
    await expect(
      mcpAuthorizationGrantRepository.findMany({}),
    ).resolves.toHaveLength(1);
  });

  it("should stamp the connection's last use when its token is refreshed", async () => {
    const tokens = await issue();
    const grantId = await grantIdOf(tokens.refresh_token as string);
    const refreshedFrom = new Date();

    await service.execute({
      client,
      refreshToken: tokens.refresh_token as string,
    });

    const grant = await mcpAuthorizationGrantRepository.findOne({
      id: grantId,
    });
    expect(grant?.last_used_at?.getTime()).toBeGreaterThanOrEqual(
      refreshedFrom.getTime(),
    );
  });

  it("should keep a refresh token from before a revocation dead after the client authorizes again and reactivates the same connection", async () => {
    const { id: user_id } = await userFactory.create();
    const beforeRevocation = await issue(user_id);
    const grantId = await grantIdOf(beforeRevocation.refresh_token as string);
    await mcpAuthorizationGrantRepository.updateOne(
      { id: grantId },
      { revoked_at: new Date() },
    );
    const afterReauthorization = await issue(user_id);

    await expect(
      service.execute({
        client,
        refreshToken: beforeRevocation.refresh_token as string,
      }),
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 400 }));

    expect(await grantIdOf(afterReauthorization.refresh_token as string)).toBe(
      grantId,
    );
    const rotated = await service.execute({
      client,
      refreshToken: afterReauthorization.refresh_token as string,
    });
    expect(await grantIdOf(rotated.refresh_token as string)).toBe(grantId);
    expect(await revokedAtOf(grantId)).toBeNull();
  });

  it("should keep a refresh token dead once its connection passed its absolute lifetime, even after the client authorizes again", async () => {
    const { id: user_id } = await userFactory.create();
    vi.useFakeTimers({ toFake: ["Date"] });
    const startedAt = Date.now();
    const beforeExpiry = await issue(user_id);
    vi.setSystemTime(startedAt + 91 * DAY_MS);
    await expect(
      service.execute({
        client,
        refreshToken: beforeExpiry.refresh_token as string,
      }),
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 400 }));

    const afterReauthorization = await issue(user_id);

    await expect(
      service.execute({
        client,
        refreshToken: beforeExpiry.refresh_token as string,
      }),
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 400 }));
    await expect(
      service.execute({
        client,
        refreshToken: afterReauthorization.refresh_token as string,
      }),
    ).resolves.toEqual(expect.objectContaining({ token_type: "Bearer" }));
  });

  it("should end an older install's refresh chain at its own absolute lifetime, even after another install of the client authorizes again", async () => {
    const { id: user_id } = await userFactory.create();
    vi.useFakeTimers({ toFake: ["Date"] });
    const startedAt = Date.now();
    const olderInstall = await issue(user_id);
    vi.setSystemTime(startedAt + 89 * DAY_MS);
    const newerInstall = await issue(user_id);
    const olderInstallRotated = await service.execute({
      client,
      refreshToken: olderInstall.refresh_token as string,
    });
    vi.setSystemTime(startedAt + 91 * DAY_MS);

    await expect(
      service.execute({
        client,
        refreshToken: olderInstallRotated.refresh_token as string,
      }),
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 400 }));
    await expect(
      service.execute({
        client,
        refreshToken: newerInstall.refresh_token as string,
      }),
    ).resolves.toEqual(expect.objectContaining({ token_type: "Bearer" }));
  });

  it("should refuse a refresh token whose grant has no row in the database", async () => {
    const tokens = await issue();
    const grantId = await grantIdOf(tokens.refresh_token as string);
    await container
      .resolve<{ client: PrismaClient }>("DatabaseProvider")
      .client.mcpAuthorizationGrant.delete({ where: { id: grantId } });

    await expect(
      service.execute({ client, refreshToken: tokens.refresh_token as string }),
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 400 }));
  });

  it("should let exactly one of two simultaneous refreshes with the same token win, and end the grant", async () => {
    const tokens = await issue();
    const grantId = await grantIdOf(tokens.refresh_token as string);

    const results = await Promise.allSettled([
      service.execute({
        client,
        refreshToken: tokens.refresh_token as string,
      }),
      service.execute({
        client,
        refreshToken: tokens.refresh_token as string,
      }),
    ]);

    expect(
      results.filter(result => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(
      1,
    );
    expect(await revokedAtOf(grantId)).toBeInstanceOf(Date);
  });

  it("should end the grant when a token that was already rotated is replayed later", async () => {
    const tokens = await issue();
    const grantId = await grantIdOf(tokens.refresh_token as string);
    const rotated = await service.execute({
      client,
      refreshToken: tokens.refresh_token as string,
    });

    await expect(
      service.execute({ client, refreshToken: tokens.refresh_token as string }),
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 400 }));

    expect(await revokedAtOf(grantId)).toBeInstanceOf(Date);
    await expect(
      service.execute({
        client,
        refreshToken: rotated.refresh_token as string,
      }),
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 400 }));
  });
});
