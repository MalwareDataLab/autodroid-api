import { Router } from "express";

// Middleware import
import { userAuthenticationMiddleware } from "@modules/user/infrastructure/http/middlewares/userAuthentication.middleware";
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import { McpAuthorizationRequestDecisionSchema } from "@modules/mcpAuthorization/schemas/mcpAuthorizationRequest.schema";

// Controller import
import { McpAuthorizationRequestController } from "../controllers/mcpAuthorizationRequest.controller";

const mcpAuthorizationRequestController =
  new McpAuthorizationRequestController();

const mcpAuthorizationRequestRouter = Router();

mcpAuthorizationRequestRouter.get(
  "/:request_id",
  userAuthenticationMiddleware,
  mcpAuthorizationRequestController.show,
);

mcpAuthorizationRequestRouter.post(
  "/:request_id/decision",
  userAuthenticationMiddleware,
  validateRequest({
    schema: McpAuthorizationRequestDecisionSchema,
    segment: "BODY",
  }),
  mcpAuthorizationRequestController.decide,
);

export { mcpAuthorizationRequestRouter };
