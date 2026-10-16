import { createHmac } from "node:crypto";

// Configuration import
import { getMcpConfig } from "@config/mcp";

const signMcpAuthorizationClientIdPayload = (encodedPayload: string): string =>
  createHmac("sha256", getMcpConfig().clientIdSecret)
    .update(encodedPayload)
    .digest("base64url");

export { signMcpAuthorizationClientIdPayload };
