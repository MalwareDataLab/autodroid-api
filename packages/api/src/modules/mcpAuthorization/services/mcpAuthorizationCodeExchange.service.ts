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
import { getMcpAuthorizationSessionsEpoch } from "../utils/getMcpAuthorizationSessionsEpoch.util";

// Constant import
import { MCP_AUTHORIZATION_CODE_KEY_PREFIX } from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationCodeRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

// Entity import
import { McpAuthorizationGrant } from "../entities/mcpAuthorizationGrant.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Service import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";

interface IRequest {
  client: OAuthClientInformationFull;
  authorizationCode: string;
  redirectUri?: string;
  resource?: URL;
}

const ERROR_KEY_PREFIX = "@mcp_authorization_code_exchange_service";

@injectable()
class McpAuthorizationCodeExchangeService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({
    client,
    authorizationCode,
    redirectUri,
    resource,
  }: IRequest): Promise<OAuthTokens> {
    const key = `${MCP_AUTHORIZATION_CODE_KEY_PREFIX}${hashBase64Url(authorizationCode)}`;

    const raw = await this.inMemoryDatabaseProvider.connection.get(key);
    if (!raw)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/CODE_NOT_FOUND`,
        message: "This authorization code was not found or has expired.",
        statusCode: 400,
      });

    const record: IMcpAuthorizationCodeRecordDTO = JSON.parse(raw);

    if (record.client_id !== client.client_id)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/CODE_CLIENT_MISMATCH`,
        message: "This authorization code was not issued to this client.",
        statusCode: 400,
      });

    if (redirectUri !== undefined && redirectUri !== record.redirect_uri)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/REDIRECT_URI_MISMATCH`,
        message:
          "redirect_uri does not match the one used to authorize this code.",
        statusCode: 400,
      });

    if ((resource?.href ?? getMcpConfig().resource) !== record.resource)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/RESOURCE_MISMATCH`,
        message: "resource does not match the one used to authorize this code.",
        statusCode: 400,
      });

    if (
      (await this.getSessionsEpoch(record.user_id)) !== record.sessions_epoch
    ) {
      await this.inMemoryDatabaseProvider.connection.del(key);
      throw this.codeRevokedError();
    }

    if (await this.findGrantRevokedSinceApproval(record)) {
      await this.inMemoryDatabaseProvider.connection.del(key);
      throw this.connectionRevokedError();
    }

    const consumedCount =
      await this.inMemoryDatabaseProvider.connection.del(key);
    if (consumedCount !== 1)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/CODE_ALREADY_CONSUMED`,
        message: "This authorization code was already used.",
        statusCode: 400,
      });

    const tokenIssueService = new McpAuthorizationTokenIssueService(
      this.inMemoryDatabaseProvider,
      this.mcpAuthorizationGrantRepository,
    );

    const tokens = await tokenIssueService.execute({
      client_id: client.client_id,
      user_auth_provider_conn_id: record.user_auth_provider_conn_id,
      resource: record.resource,
      scopes: record.scopes,
      user_id: record.user_id,
      client_name: client.client_name,
    });

    if (
      (await this.getSessionsEpoch(record.user_id)) !== record.sessions_epoch
    ) {
      await this.mcpAuthorizationGrantRepository.updateMany(
        { user_id: record.user_id, active: true },
        { revoked_at: new Date() },
      );
      throw this.codeRevokedError();
    }

    const revokedGrant = await this.findGrantRevokedSinceApproval(record);
    if (revokedGrant) {
      await this.mcpAuthorizationGrantRepository.updateMany(
        { id: revokedGrant.id, active: true },
        { revoked_at: new Date() },
      );
      throw this.connectionRevokedError();
    }

    return tokens;
  }

  private async findGrantRevokedSinceApproval(
    record: IMcpAuthorizationCodeRecordDTO,
  ): Promise<McpAuthorizationGrant | null> {
    const grant = await this.mcpAuthorizationGrantRepository.findOne({
      user_id: record.user_id,
      client_id: record.client_id,
      resource: record.resource,
    });

    return grant && grant.token_generation !== record.grant_token_generation
      ? grant
      : null;
  }

  private getSessionsEpoch(user_id: string): Promise<number> {
    return getMcpAuthorizationSessionsEpoch({
      inMemoryDatabaseProvider: this.inMemoryDatabaseProvider,
      user_id,
    });
  }

  private codeRevokedError(): AppError {
    return new AppError({
      key: `${ERROR_KEY_PREFIX}/CODE_REVOKED`,
      message:
        "This authorization code was approved before the account's sessions were closed.",
      statusCode: 400,
    });
  }

  private connectionRevokedError(): AppError {
    return new AppError({
      key: `${ERROR_KEY_PREFIX}/CONNECTION_REVOKED`,
      message:
        "This authorization code was approved before its connection was revoked.",
      statusCode: 400,
    });
  }
}

export { McpAuthorizationCodeExchangeService };
