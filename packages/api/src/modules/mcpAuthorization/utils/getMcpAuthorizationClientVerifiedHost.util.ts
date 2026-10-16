// Constant import
import { MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX } from "../constants/mcpAuthorization.constant";

const getMcpAuthorizationClientVerifiedHost = (
  client_id: string,
): string | null =>
  client_id.startsWith(MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX)
    ? null
    : new URL(client_id).host;

export { getMcpAuthorizationClientVerifiedHost };
