import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { Router } from "express";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { mcpAuthorizationOAuthProvider } from "@modules/mcpAuthorization/infrastructure/oauth/mcpAuthorizationOAuth.provider";

// Middleware import
import { mcpBearerChallengeMiddleware } from "@modules/mcp/infrastructure/http/middlewares/mcpBearerChallenge.middleware";
import { mcpOriginMiddleware } from "@modules/mcp/infrastructure/http/middlewares/mcpOrigin.middleware";

// Util import
import { createMcpGraphQLExecutor } from "@modules/mcp/utils/createMcpGraphQLExecutor.util";
import { deriveEveryMcpToolInput } from "@modules/mcp/utils/createMcpServer.util";

// Controller import
import { McpController } from "@modules/mcp/infrastructure/http/controllers/mcp.controller";

// Infrastructure import
import type { GraphQLApp } from "@shared/infrastructure/graphql";

const buildMcpRouter = (graphqlApp: GraphQLApp): Router => {
  deriveEveryMcpToolInput();
  const mcpController = new McpController(createMcpGraphQLExecutor(graphqlApp));
  const { protectedResourceMetadataUrl, resource } = getMcpConfig();

  const mcpRouter = Router();

  mcpRouter.use(mcpOriginMiddleware);

  mcpRouter.post(
    "/",
    mcpBearerChallengeMiddleware,
    requireBearerAuth({
      verifier: mcpAuthorizationOAuthProvider,
      resourceMetadataUrl: protectedResourceMetadataUrl,
      expectedResource: new URL(resource),
    }),
    (req, res) => mcpController.handle(req, res),
  );

  mcpRouter.get("/", mcpController.methodNotAllowed);
  mcpRouter.delete("/", mcpController.methodNotAllowed);

  return mcpRouter;
};

export { buildMcpRouter };
