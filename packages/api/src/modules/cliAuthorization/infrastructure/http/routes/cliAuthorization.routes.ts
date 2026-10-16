import { Router } from "express";

// Middleware import
import { userAuthenticationMiddleware } from "@modules/user/infrastructure/http/middlewares/userAuthentication.middleware";
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import {
  CliAuthorizationAuthorizeSchema,
  CliAuthorizationRegisterSchema,
  CliAuthorizationTokenSchema,
} from "@modules/cliAuthorization/schemas/cliAuthorization.schema";

// Controller import
import { CliAuthorizationController } from "../controllers/cliAuthorization.controller";

const cliAuthorizationController = new CliAuthorizationController();

const cliAuthorizationRouter = Router();

cliAuthorizationRouter.post(
  "/register",
  validateRequest({
    schema: CliAuthorizationRegisterSchema,
    segment: "BODY",
  }),
  cliAuthorizationController.register,
);

cliAuthorizationRouter.post(
  "/authorize",
  userAuthenticationMiddleware,
  validateRequest({
    schema: CliAuthorizationAuthorizeSchema,
    segment: "BODY",
  }),
  cliAuthorizationController.authorize,
);

cliAuthorizationRouter.post(
  "/token",
  validateRequest({
    schema: CliAuthorizationTokenSchema,
    segment: "BODY",
  }),
  cliAuthorizationController.token,
);

export { cliAuthorizationRouter };
