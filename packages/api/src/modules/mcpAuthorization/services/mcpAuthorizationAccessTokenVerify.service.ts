import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { inject, injectable } from "tsyringe";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";
import { parse } from "@shared/utils/instanceParser";
import {
  getMcpAuthorizationHeldScopes,
  isMcpAuthorizationGrantLive,
} from "../utils/mcpAuthorizationGrantRecord.util";

// Constant import
import { MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX } from "../constants/mcpAuthorization.constant";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";
import type { IMcpAuthorizationAccessTokenRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

// Repository import
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";

interface IRequest {
  token: string;
}

const ERROR_KEY_PREFIX = "@mcp_authorization_access_token_verify_service";

@injectable()
class McpAuthorizationAccessTokenVerifyService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("UserAuthProviderConnRepository")
    private userAuthProviderConnRepository: IUserAuthProviderConnRepository,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({ token }: IRequest): Promise<AuthInfo> {
    const raw = await this.inMemoryDatabaseProvider.connection.get(
      `${MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX}${hashBase64Url(token)}`,
    );
    if (!raw) throw this.invalidToken();

    const record: IMcpAuthorizationAccessTokenRecordDTO = JSON.parse(raw);

    if (record.resource !== getMcpConfig().resource) throw this.invalidToken();

    if (!record.grant_id) throw this.invalidToken();

    const grant = await this.mcpAuthorizationGrantRepository.findOne({
      id: record.grant_id,
      active: true,
    });
    if (!isMcpAuthorizationGrantLive(grant, record)) throw this.invalidToken();

    const userAuthProviderConn =
      await this.userAuthProviderConnRepository.findOne({
        id: record.user_auth_provider_conn_id,
      });
    if (!userAuthProviderConn) throw this.invalidToken();

    const session = parse(Session, {
      user: userAuthProviderConn.user,
      user_auth_provider_conn: userAuthProviderConn,
      user_session: {
        access_token: token,
        access_token_expires_at: new Date(record.expires_at * 1000),
        refresh_token: null,
        refresh_token_expires_at: null,
        payload: {},
        user_auth_provider_conn_id: userAuthProviderConn.id,
        user_auth_provider_conn: userAuthProviderConn,
      },
      is_admin: userAuthProviderConn.user.is_admin,
    });

    return {
      token,
      clientId: record.client_id,
      scopes: getMcpAuthorizationHeldScopes(grant, record),
      expiresAt: record.expires_at,
      resource: new URL(record.resource),
      extra: { session },
    };
  }

  private invalidToken(): AppError {
    return new AppError({
      key: `${ERROR_KEY_PREFIX}/TOKEN_NOT_FOUND`,
      message: "This access token was not found, has expired, or was revoked.",
      statusCode: 401,
    });
  }
}

export { McpAuthorizationAccessTokenVerifyService };
