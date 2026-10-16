// Configuration import
import { getEnvConfig } from "@config/env";

interface IMcpConfig {
  issuer: string;
  resource: string;
  resourceName: string;
  protectedResourceMetadataUrl: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint: string;
  revocationEndpoint: string;
  consentUrl: string;
  clientIdSecret: string;
}

const getMcpConfig = (): IMcpConfig => {
  const { APP_URL, FRONTEND_URL, MCP_OAUTH_CLIENT_ID_SECRET } = getEnvConfig();

  if (!APP_URL) throw new Error("APP_URL environment variable is required.");
  if (!FRONTEND_URL)
    throw new Error("FRONTEND_URL environment variable is required.");
  if (!MCP_OAUTH_CLIENT_ID_SECRET)
    throw new Error(
      "MCP_OAUTH_CLIENT_ID_SECRET environment variable is required.",
    );

  const issuer = new URL(APP_URL).origin;

  return {
    issuer,
    resource: `${issuer}/mcp`,
    resourceName: "AutoDroid",
    protectedResourceMetadataUrl: `${issuer}/.well-known/oauth-protected-resource/mcp`,
    authorizationEndpoint: `${issuer}/oauth/authorize`,
    tokenEndpoint: `${issuer}/oauth/token`,
    registrationEndpoint: `${issuer}/oauth/register`,
    revocationEndpoint: `${issuer}/oauth/revoke`,
    consentUrl: `${FRONTEND_URL}/mcp/authorize`,
    clientIdSecret: MCP_OAUTH_CLIENT_ID_SECRET,
  };
};

export { getMcpConfig };
