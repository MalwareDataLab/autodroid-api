import { Request, Response, NextFunction } from "express";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Constant import
import { MCP_DEFAULT_SCOPES } from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

const mcpBearerChallengeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.headers.authorization) {
    next();
    return;
  }

  res
    .status(401)
    .set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${getMcpConfig().protectedResourceMetadataUrl}", scope="${MCP_DEFAULT_SCOPES.join(" ")}"`,
    )
    .json({
      error: "unauthorized",
      error_description: "Missing Authorization header",
    });
};

export { mcpBearerChallengeMiddleware };
