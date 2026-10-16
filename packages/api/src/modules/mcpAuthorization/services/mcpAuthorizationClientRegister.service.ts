import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { isMcpAuthorizationRedirectUriAllowed } from "../utils/isMcpAuthorizationRedirectUriAllowed.util";
import { signMcpAuthorizationClientIdPayload } from "../utils/signMcpAuthorizationClientIdPayload.util";

// Constant import
import {
  MCP_AUTHORIZATION_DCR_MAX_CLIENT_NAME_LENGTH,
  MCP_AUTHORIZATION_DCR_MAX_REDIRECT_URIS,
  MCP_AUTHORIZATION_DCR_MAX_REDIRECT_URI_LENGTH,
  MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX,
  MCP_AUTHORIZATION_LOOPBACK_HOSTNAMES,
} from "../constants/mcpAuthorization.constant";

interface IRequest {
  redirect_uris: string[];
  client_name?: string;
}

const ERROR_KEY =
  "@mcp_authorization_client_register_service/INVALID_CLIENT_METADATA";

@injectable()
class McpAuthorizationClientRegisterService {
  public execute({
    redirect_uris,
    client_name,
  }: IRequest): OAuthClientInformationFull {
    this.validateRedirectUris(redirect_uris);
    this.validateClientName(client_name);

    const client_id = this.signClientId({
      redirect_uris: redirect_uris.map(redirectUri =>
        this.withoutLoopbackPort(redirectUri),
      ),
      client_name,
    });

    return {
      client_id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris,
      ...(client_name && { client_name }),
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    };
  }

  private invalid(message: string): AppError {
    return new AppError({ key: ERROR_KEY, message, statusCode: 400 });
  }

  private validateRedirectUris(redirect_uris: string[]): void {
    if (!redirect_uris.length)
      throw this.invalid("At least one redirect_uri is required.");

    if (redirect_uris.length > MCP_AUTHORIZATION_DCR_MAX_REDIRECT_URIS)
      throw this.invalid(
        `A client may register at most ${MCP_AUTHORIZATION_DCR_MAX_REDIRECT_URIS} redirect_uris.`,
      );

    redirect_uris.forEach(redirectUri => this.validateRedirectUri(redirectUri));
  }

  private validateRedirectUri(redirectUri: string): void {
    if (redirectUri.length > MCP_AUTHORIZATION_DCR_MAX_REDIRECT_URI_LENGTH)
      throw this.invalid(
        `redirect_uri must be at most ${MCP_AUTHORIZATION_DCR_MAX_REDIRECT_URI_LENGTH} characters.`,
      );

    if (!isMcpAuthorizationRedirectUriAllowed(redirectUri))
      throw this.invalid(
        `redirect_uri "${redirectUri}" must use https, or http on a loopback address.`,
      );
  }

  private withoutLoopbackPort(redirectUri: string): string {
    const parsed = new URL(redirectUri);
    if (!MCP_AUTHORIZATION_LOOPBACK_HOSTNAMES.includes(parsed.hostname))
      return redirectUri;

    parsed.port = "";
    return parsed.href;
  }

  private validateClientName(client_name: string | undefined): void {
    if (
      client_name &&
      client_name.length > MCP_AUTHORIZATION_DCR_MAX_CLIENT_NAME_LENGTH
    )
      throw this.invalid(
        `client_name must be at most ${MCP_AUTHORIZATION_DCR_MAX_CLIENT_NAME_LENGTH} characters.`,
      );
  }

  private signClientId(payload: {
    redirect_uris: string[];
    client_name?: string;
  }): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );

    return `${MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX}${encodedPayload}.${signMcpAuthorizationClientIdPayload(encodedPayload)}`;
  }
}

export { McpAuthorizationClientRegisterService };
