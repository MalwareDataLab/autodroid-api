import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { inject, injectable } from "tsyringe";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";
import {
  getMcpAuthorizationHeldScopes,
  isMcpAuthorizationGrantLive,
} from "../utils/mcpAuthorizationGrantRecord.util";

// Constant import
import {
  MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX,
  MCP_AUTHORIZATION_REFRESH_TOKEN_TTL_SECONDS,
  MCP_AUTHORIZATION_REFRESH_TOKEN_USED_KEY_PREFIX,
} from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationTokenRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Service import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";

interface IRequest {
  client: OAuthClientInformationFull;
  refreshToken: string;
  scopes?: string[];
  resource?: URL;
}

const ERROR_KEY_PREFIX = "@mcp_authorization_token_refresh_service";

@injectable()
class McpAuthorizationTokenRefreshService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({
    client,
    refreshToken,
    scopes,
    resource,
  }: IRequest): Promise<OAuthTokens> {
    const tokenHash = hashBase64Url(refreshToken);
    const key = `${MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX}${tokenHash}`;

    const raw = await this.inMemoryDatabaseProvider.connection.get(key);
    if (!raw) {
      await this.handleMissingToken(tokenHash);
      throw this.invalidGrant(
        "This refresh token was not found or has expired.",
      );
    }

    const record: IMcpAuthorizationTokenRecordDTO = JSON.parse(raw);

    if (record.client_id !== client.client_id)
      throw this.invalidGrant(
        "This refresh token was not issued to this client.",
      );

    if ((resource?.href ?? getMcpConfig().resource) !== record.resource)
      throw this.invalidGrant(
        "resource does not match the one this refresh token was issued for.",
      );

    if (!record.grant_id)
      throw this.invalidGrant(
        "This refresh token names no authorization grant.",
      );

    const grant = await this.mcpAuthorizationGrantRepository.findOne({
      id: record.grant_id,
      active: true,
    });
    if (!isMcpAuthorizationGrantLive(grant, record))
      throw this.invalidGrant(
        "This authorization grant was revoked or has exceeded its absolute lifetime and cannot be refreshed further.",
      );

    const heldScopes = getMcpAuthorizationHeldScopes(grant, record);
    if (!heldScopes.length)
      throw this.invalidGrant(
        "This authorization grant no longer holds any scope this refresh token was issued for.",
      );

    if (scopes && !scopes.every(scope => heldScopes.includes(scope)))
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/INVALID_SCOPE`,
        message: "A refresh cannot widen the scopes the grant holds.",
        statusCode: 400,
      });
    const grantedScopes = scopes
      ? heldScopes.filter(scope => scopes.includes(scope))
      : heldScopes;

    const [[, consumedCount]] = (await this.inMemoryDatabaseProvider.connection
      .multi()
      .del(key)
      .set(
        `${MCP_AUTHORIZATION_REFRESH_TOKEN_USED_KEY_PREFIX}${tokenHash}`,
        JSON.stringify({ grant_id: record.grant_id }),
        "EX",
        MCP_AUTHORIZATION_REFRESH_TOKEN_TTL_SECONDS,
      )
      .exec()) as [[unknown, number], ...unknown[]];
    if (consumedCount !== 1) {
      await this.revokeGrant(record.grant_id);
      throw this.invalidGrant("This refresh token was already used.");
    }

    const tokenIssueService = new McpAuthorizationTokenIssueService(
      this.inMemoryDatabaseProvider,
      this.mcpAuthorizationGrantRepository,
    );

    const tokens = await tokenIssueService.execute({
      client_id: record.client_id,
      user_auth_provider_conn_id: record.user_auth_provider_conn_id,
      resource: record.resource,
      scopes: grantedScopes,
      grant_scopes: heldScopes,
      grant_id: record.grant_id,
      token_generation: record.token_generation,
      grant_expires_at: record.grant_expires_at,
    });

    return tokens;
  }

  private async handleMissingToken(tokenHash: string): Promise<void> {
    const usedRaw = await this.inMemoryDatabaseProvider.connection.get(
      `${MCP_AUTHORIZATION_REFRESH_TOKEN_USED_KEY_PREFIX}${tokenHash}`,
    );
    if (!usedRaw) return;

    const { grant_id } = JSON.parse(usedRaw);
    await this.revokeGrant(grant_id);
  }

  private async revokeGrant(grant_id: string): Promise<void> {
    await this.mcpAuthorizationGrantRepository.updateMany(
      { id: grant_id, active: true },
      { revoked_at: new Date() },
    );
  }

  private invalidGrant(message: string): AppError {
    return new AppError({
      key: `${ERROR_KEY_PREFIX}/INVALID_GRANT`,
      message,
      statusCode: 400,
    });
  }
}

export { McpAuthorizationTokenRefreshService };
