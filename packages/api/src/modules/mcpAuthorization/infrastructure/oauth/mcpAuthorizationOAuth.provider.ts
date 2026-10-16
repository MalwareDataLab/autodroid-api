import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
  OAuthError,
  ServerError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Response } from "express";
import { container } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Service import
import { McpAuthorizationAccessTokenVerifyService } from "@modules/mcpAuthorization/services/mcpAuthorizationAccessTokenVerify.service";
import { McpAuthorizationClientRegisterService } from "@modules/mcpAuthorization/services/mcpAuthorizationClientRegister.service";
import { McpAuthorizationClientResolveService } from "@modules/mcpAuthorization/services/mcpAuthorizationClientResolve.service";
import { McpAuthorizationCodeChallengeService } from "@modules/mcpAuthorization/services/mcpAuthorizationCodeChallenge.service";
import { McpAuthorizationCodeExchangeService } from "@modules/mcpAuthorization/services/mcpAuthorizationCodeExchange.service";
import { McpAuthorizationRequestCreateService } from "@modules/mcpAuthorization/services/mcpAuthorizationRequestCreate.service";
import { McpAuthorizationTokenRefreshService } from "@modules/mcpAuthorization/services/mcpAuthorizationTokenRefresh.service";
import { McpAuthorizationTokenRevokeService } from "@modules/mcpAuthorization/services/mcpAuthorizationTokenRevoke.service";

const toOAuthError = (
  error: unknown,
  makeSpecificError: (message: string) => OAuthError,
): OAuthError => {
  if (!AppError.isInstance(error))
    return new ServerError("Internal Server Error");

  const appError = error as AppError;
  if (appError.statusCode >= 500) return new ServerError(appError.message);
  if (appError.key.endsWith("/INVALID_SCOPE"))
    return new InvalidScopeError(appError.message);

  return makeSpecificError(appError.message);
};

class McpAuthorizationOAuthProvider implements OAuthServerProvider {
  public get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (client_id: string) => {
        const clientResolveService = container.resolve(
          McpAuthorizationClientResolveService,
        );
        return clientResolveService.execute({ client_id });
      },

      registerClient: (
        client: Omit<
          OAuthClientInformationFull,
          "client_id" | "client_id_issued_at"
        >,
      ) => {
        const clientRegisterService = container.resolve(
          McpAuthorizationClientRegisterService,
        );
        try {
          return clientRegisterService.execute({
            redirect_uris: client.redirect_uris,
            client_name: client.client_name,
          });
        } catch (error) {
          throw toOAuthError(
            error,
            message => new InvalidClientMetadataError(message),
          );
        }
      },
    };
  }

  public async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const requestCreateService = container.resolve(
      McpAuthorizationRequestCreateService,
    );

    let consentUrl: string;
    try {
      consentUrl = await requestCreateService.execute({ client, params });
    } catch (error) {
      throw toOAuthError(error, message => new InvalidTargetError(message));
    }

    res.redirect(302, consentUrl);
  }

  public async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const codeChallengeService = container.resolve(
      McpAuthorizationCodeChallengeService,
    );
    try {
      return await codeChallengeService.execute({ client, authorizationCode });
    } catch (error) {
      throw toOAuthError(error, message => new InvalidGrantError(message));
    }
  }

  public async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const codeExchangeService = container.resolve(
      McpAuthorizationCodeExchangeService,
    );
    try {
      return await codeExchangeService.execute({
        client,
        authorizationCode,
        redirectUri,
        resource,
      });
    } catch (error) {
      throw toOAuthError(error, message => new InvalidGrantError(message));
    }
  }

  public async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const tokenRefreshService = container.resolve(
      McpAuthorizationTokenRefreshService,
    );
    try {
      return await tokenRefreshService.execute({
        client,
        refreshToken,
        scopes,
        resource,
      });
    } catch (error) {
      throw toOAuthError(error, message => new InvalidGrantError(message));
    }
  }

  public async verifyAccessToken(token: string): Promise<AuthInfo> {
    const accessTokenVerifyService = container.resolve(
      McpAuthorizationAccessTokenVerifyService,
    );
    try {
      return await accessTokenVerifyService.execute({ token });
    } catch (error) {
      throw toOAuthError(error, message => new InvalidTokenError(message));
    }
  }

  public async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const tokenRevokeService = container.resolve(
      McpAuthorizationTokenRevokeService,
    );
    await tokenRevokeService.execute({ client, request });
  }
}

const mcpAuthorizationOAuthProvider = new McpAuthorizationOAuthProvider();

export { mcpAuthorizationOAuthProvider, McpAuthorizationOAuthProvider };
