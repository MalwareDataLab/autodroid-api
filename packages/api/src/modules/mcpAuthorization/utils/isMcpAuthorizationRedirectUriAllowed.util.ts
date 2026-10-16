// Constant import
import { MCP_AUTHORIZATION_LOOPBACK_HOSTNAMES } from "../constants/mcpAuthorization.constant";

const isMcpAuthorizationRedirectUriAllowed = (redirectUri: string): boolean => {
  const { protocol, hostname } = new URL(redirectUri);

  return (
    protocol === "https:" ||
    (protocol === "http:" &&
      MCP_AUTHORIZATION_LOOPBACK_HOSTNAMES.includes(hostname))
  );
};

export { isMcpAuthorizationRedirectUriAllowed };
