import { authorizationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/authorize.js";
import { metadataHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/metadata.js";
import { clientRegistrationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/register.js";
import { revocationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/revoke.js";
import { tokenHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/token.js";
import { Router } from "express";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { mcpAuthorizationOAuthProvider } from "@modules/mcpAuthorization/infrastructure/oauth/mcpAuthorizationOAuth.provider";

// Middleware import
import { mcpAuthorizationErrorRedirectGuardMiddleware } from "@modules/mcpAuthorization/infrastructure/http/middlewares/mcpAuthorizationErrorRedirectGuard.middleware";
import { mcpAuthorizationRegisterRateLimiterMiddleware } from "@modules/mcpAuthorization/infrastructure/http/middlewares/mcpAuthorizationRegisterRateLimiter.middleware";

// Constant import
import { MCP_SUPPORTED_SCOPES } from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

const buildAuthorizationServerMetadata = () => {
  const mcpConfig = getMcpConfig();
  return {
    issuer: mcpConfig.issuer,
    authorization_endpoint: mcpConfig.authorizationEndpoint,
    token_endpoint: mcpConfig.tokenEndpoint,
    registration_endpoint: mcpConfig.registrationEndpoint,
    revocation_endpoint: mcpConfig.revocationEndpoint,
    scopes_supported: MCP_SUPPORTED_SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
  };
};

const buildProtectedResourceMetadata = () => {
  const mcpConfig = getMcpConfig();
  return {
    resource: mcpConfig.resource,
    authorization_servers: [mcpConfig.issuer],
    scopes_supported: MCP_SUPPORTED_SCOPES,
    bearer_methods_supported: ["header"],
    resource_name: mcpConfig.resourceName,
  };
};

const mcpAuthorizationRouter = Router();

mcpAuthorizationRouter.use(
  "/.well-known/oauth-authorization-server",
  (req, res, next) =>
    metadataHandler(buildAuthorizationServerMetadata())(req, res, next),
);

mcpAuthorizationRouter.use(
  "/.well-known/oauth-protected-resource/mcp",
  (req, res, next) =>
    metadataHandler(buildProtectedResourceMetadata())(req, res, next),
);

mcpAuthorizationRouter.use(
  "/oauth/authorize",
  mcpAuthorizationErrorRedirectGuardMiddleware,
  authorizationHandler({ provider: mcpAuthorizationOAuthProvider }),
);

mcpAuthorizationRouter.use(
  "/oauth/token",
  tokenHandler({ provider: mcpAuthorizationOAuthProvider }),
);

mcpAuthorizationRouter.use(
  "/oauth/register",
  mcpAuthorizationRegisterRateLimiterMiddleware,
  clientRegistrationHandler({
    clientsStore: mcpAuthorizationOAuthProvider.clientsStore,
    clientIdGeneration: false,
    rateLimit: false,
  }),
);

mcpAuthorizationRouter.use(
  "/oauth/revoke",
  revocationHandler({ provider: mcpAuthorizationOAuthProvider }),
);

export { mcpAuthorizationRouter };
