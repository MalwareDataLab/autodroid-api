import { randomBytes } from "node:crypto";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { inject, injectable } from "tsyringe";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { resolveMcpAuthorizationScopes } from "../utils/resolveMcpAuthorizationScopes.util";

// Constant import
import {
  MCP_AUTHORIZATION_REQUEST_KEY_PREFIX,
  MCP_AUTHORIZATION_REQUEST_TTL_SECONDS,
  MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX,
} from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationRequestRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

interface IAuthorizationParams {
  state?: string;
  scopes?: string[];
  codeChallenge: string;
  redirectUri: string;
  resource?: URL;
}

interface IRequest {
  client: OAuthClientInformationFull;
  params: IAuthorizationParams;
}

@injectable()
class McpAuthorizationRequestCreateService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({ client, params }: IRequest): Promise<string> {
    this.validateResource(params.resource);

    const request_id = randomBytes(32).toString("base64url");

    const record: IMcpAuthorizationRequestRecordDTO = {
      client_id: client.client_id,
      client_kind: client.client_id.startsWith(
        MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX,
      )
        ? "dcr"
        : "cimd",
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      state: params.state,
      scopes: resolveMcpAuthorizationScopes(params.scopes),
      resource: params.resource?.href ?? getMcpConfig().resource,
    };

    await this.inMemoryDatabaseProvider.connection.set(
      `${MCP_AUTHORIZATION_REQUEST_KEY_PREFIX}${request_id}`,
      JSON.stringify(record),
      "EX",
      MCP_AUTHORIZATION_REQUEST_TTL_SECONDS,
    );

    return `${getMcpConfig().consentUrl}?request_id=${request_id}`;
  }

  private validateResource(resource: URL | undefined): void {
    if (!resource) return;

    if (resource.href !== getMcpConfig().resource)
      throw new AppError({
        key: "@mcp_authorization_request_create_service/INVALID_RESOURCE",
        message: "The requested resource does not match this MCP server.",
        statusCode: 400,
      });
  }
}

export { McpAuthorizationRequestCreateService };
