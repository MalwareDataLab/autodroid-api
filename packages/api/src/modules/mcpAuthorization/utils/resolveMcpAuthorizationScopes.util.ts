// Error import
import { AppError } from "@shared/errors/AppError";

// Constant import
import {
  MCP_DEFAULT_SCOPES,
  MCP_SCOPE_ADMIN,
  MCP_SUPPORTED_SCOPES,
} from "../constants/mcpAuthorization.constant";

const resolveMcpAuthorizationScopes = (requested?: string[]): string[] => {
  const asked = requested?.filter(Boolean);
  if (!asked?.length) return MCP_DEFAULT_SCOPES;

  const unknown = asked.find(scope => !MCP_SUPPORTED_SCOPES.includes(scope));
  if (unknown !== undefined)
    throw new AppError({
      key: "@mcp_authorization_scopes/INVALID_SCOPE",
      message: `Unknown scope: ${unknown}.`,
      statusCode: 400,
    });

  return MCP_SUPPORTED_SCOPES.filter(scope => asked.includes(scope));
};

const grantableMcpAuthorizationScopes = (
  scopes: string[],
  isAdmin: boolean,
): string[] =>
  isAdmin ? scopes : scopes.filter(scope => scope !== MCP_SCOPE_ADMIN);

export { grantableMcpAuthorizationScopes, resolveMcpAuthorizationScopes };
