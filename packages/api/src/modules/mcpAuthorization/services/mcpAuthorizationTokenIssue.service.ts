import { randomBytes } from "node:crypto";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { inject, injectable } from "tsyringe";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import {
  MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX,
  MCP_AUTHORIZATION_ACCESS_TOKEN_TTL_SECONDS,
  MCP_AUTHORIZATION_GRANT_ABSOLUTE_TTL_SECONDS,
  MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX,
  MCP_AUTHORIZATION_REFRESH_TOKEN_TTL_SECONDS,
} from "../constants/mcpAuthorization.constant";

// DTO import
import type {
  IMcpAuthorizationAccessTokenRecordDTO,
  IMcpAuthorizationTokenRecordDTO,
} from "../types/IMcpAuthorizationRecord.dto";

// Entity import
import { McpAuthorizationGrant } from "../entities/mcpAuthorizationGrant.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

interface IBaseRequest {
  client_id: string;
  user_auth_provider_conn_id: string;
  resource: string;
  scopes: string[];
  grant_scopes?: string[];
}

type IRequest = IBaseRequest &
  (
    | { grant_id: string; token_generation: number; grant_expires_at: number }
    | { grant_id?: undefined; user_id: string; client_name?: string }
  );

@injectable()
class McpAuthorizationTokenIssueService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute(request: IRequest): Promise<OAuthTokens> {
    const {
      client_id,
      user_auth_provider_conn_id,
      resource,
      scopes,
      grant_scopes,
    } = request;
    const access_token = randomBytes(32).toString("base64url");
    const refresh_token = randomBytes(32).toString("base64url");

    const grant = await this.recordGrantUse(request);

    const record: IMcpAuthorizationTokenRecordDTO = {
      client_id,
      user_auth_provider_conn_id,
      resource,
      scopes,
      grant_id: grant.id,
      token_generation: grant.token_generation,
      grant_expires_at: grant.grant_expires_at,
    };

    const accessRecord: IMcpAuthorizationAccessTokenRecordDTO = {
      ...record,
      expires_at:
        Math.floor(Date.now() / 1000) +
        MCP_AUTHORIZATION_ACCESS_TOKEN_TTL_SECONDS,
    };

    await this.inMemoryDatabaseProvider.connection.set(
      `${MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX}${hashBase64Url(access_token)}`,
      JSON.stringify(accessRecord),
      "EX",
      MCP_AUTHORIZATION_ACCESS_TOKEN_TTL_SECONDS,
    );

    await this.inMemoryDatabaseProvider.connection.set(
      `${MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX}${hashBase64Url(refresh_token)}`,
      JSON.stringify({ ...record, scopes: grant_scopes ?? scopes }),
      "EX",
      MCP_AUTHORIZATION_REFRESH_TOKEN_TTL_SECONDS,
    );

    return {
      access_token,
      token_type: "Bearer",
      expires_in: MCP_AUTHORIZATION_ACCESS_TOKEN_TTL_SECONDS,
      refresh_token,
      scope: scopes.join(" "),
    };
  }

  private async recordGrantUse(
    request: IRequest,
  ): Promise<
    Pick<McpAuthorizationGrant, "id" | "token_generation"> &
      Pick<IMcpAuthorizationTokenRecordDTO, "grant_expires_at">
  > {
    const last_used_at = new Date();

    if (request.grant_id !== undefined) {
      await this.mcpAuthorizationGrantRepository.updateMany(
        { id: request.grant_id },
        { last_used_at },
      );

      return {
        id: request.grant_id,
        token_generation: request.token_generation,
        grant_expires_at: request.grant_expires_at,
      };
    }

    const grant = await this.mcpAuthorizationGrantRepository.upsertOne({
      id: randomBytes(16).toString("base64url"),
      user_id: request.user_id,
      client_id: request.client_id,
      client_name: request.client_name ?? null,
      resource: request.resource,
      scopes: request.scopes,
      expires_at: new Date(
        last_used_at.getTime() +
          MCP_AUTHORIZATION_GRANT_ABSOLUTE_TTL_SECONDS * 1000,
      ),
      last_used_at,
    });

    return {
      id: grant.id,
      token_generation: grant.token_generation,
      grant_expires_at: grant.expires_at.getTime(),
    };
  }
}

export { McpAuthorizationTokenIssueService };
