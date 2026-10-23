import { randomBytes } from "node:crypto";
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
import { grantableMcpAuthorizationScopes } from "../utils/resolveMcpAuthorizationScopes.util";

// Constant import
import {
  MCP_AUTHORIZATION_CODE_KEY_PREFIX,
  MCP_AUTHORIZATION_CODE_TTL_SECONDS,
  MCP_AUTHORIZATION_REQUEST_KEY_PREFIX,
} from "../constants/mcpAuthorization.constant";

// DTO import
import type {
  IMcpAuthorizationCodeRecordDTO,
  IMcpAuthorizationRequestRecordDTO,
} from "../types/IMcpAuthorizationRecord.dto";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

interface IRequest {
  request_id: string;
  approve: boolean;
  is_admin: boolean;
  user_auth_provider_conn: UserAuthProviderConn;
}

interface IResult {
  redirect_to: string;
}

const ERROR_KEY_PREFIX = "@mcp_authorization_request_decide_service";

@injectable()
class McpAuthorizationRequestDecideService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({
    request_id,
    approve,
    is_admin,
    user_auth_provider_conn,
  }: IRequest): Promise<IResult> {
    const key = `${MCP_AUTHORIZATION_REQUEST_KEY_PREFIX}${request_id}`;

    const raw = await this.inMemoryDatabaseProvider.connection.get(key);
    if (!raw)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/REQUEST_NOT_FOUND`,
        message: "This authorization request was not found or has expired.",
        statusCode: 404,
      });

    const record: IMcpAuthorizationRequestRecordDTO = JSON.parse(raw);

    if (!record.presented_at)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/REQUEST_NOT_PRESENTED`,
        message: "This authorization request's details were never shown.",
        statusCode: 409,
      });

    const claimed = await this.inMemoryDatabaseProvider.connection.del(key);
    if (!claimed)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/REQUEST_NOT_FOUND`,
        message: "This authorization request was not found or has expired.",
        statusCode: 404,
      });

    if (!approve) {
      return {
        redirect_to: this.buildRedirect(record, {
          error: "access_denied",
        }),
      };
    }

    const scopes = grantableMcpAuthorizationScopes(record.scopes, is_admin);
    if (!scopes.length) {
      return {
        redirect_to: this.buildRedirect(record, { error: "invalid_scope" }),
      };
    }

    const code = randomBytes(32).toString("base64url");
    const sessionsEpoch = await getMcpAuthorizationSessionsEpoch({
      inMemoryDatabaseProvider: this.inMemoryDatabaseProvider,
      user_id: user_auth_provider_conn.user_id,
    });
    const grant = await this.mcpAuthorizationGrantRepository.findOne({
      user_id: user_auth_provider_conn.user_id,
      client_id: record.client_id,
      resource: record.resource,
    });

    const codeRecord: IMcpAuthorizationCodeRecordDTO = {
      client_id: record.client_id,
      redirect_uri: record.redirect_uri,
      code_challenge: record.code_challenge,
      resource: record.resource,
      scopes,
      user_auth_provider_conn_id: user_auth_provider_conn.id,
      user_id: user_auth_provider_conn.user_id,
      sessions_epoch: sessionsEpoch,
      grant_token_generation: grant?.token_generation ?? 0,
    };

    await this.inMemoryDatabaseProvider.connection.set(
      `${MCP_AUTHORIZATION_CODE_KEY_PREFIX}${hashBase64Url(code)}`,
      JSON.stringify(codeRecord),
      "EX",
      MCP_AUTHORIZATION_CODE_TTL_SECONDS,
    );

    return { redirect_to: this.buildRedirect(record, { code }) };
  }

  private buildRedirect(
    record: IMcpAuthorizationRequestRecordDTO,
    outcome: { code: string } | { error: string },
  ): string {
    const url = new URL(record.redirect_uri);

    if ("code" in outcome) {
      url.searchParams.set("code", outcome.code);
    } else {
      url.searchParams.set("error", outcome.error);
    }

    if (record.state) url.searchParams.set("state", record.state);
    url.searchParams.set("iss", getMcpConfig().issuer);

    return url.href;
  }
}

export { McpAuthorizationRequestDecideService };
