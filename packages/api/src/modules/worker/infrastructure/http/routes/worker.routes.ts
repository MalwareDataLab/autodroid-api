import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";
import { workerAuthenticationMiddleware } from "../middlewares/workerAuthentication.middleware";
import { workerAuthenticationGuardMiddleware } from "../middlewares/workerAuthenticationGuard.middleware";

// Schema import
import {
  WorkerRefreshTokenSchema,
  WorkerRegisterSchema,
} from "@modules/worker/schemas/worker.schema";

// Controller import
import { WorkerController } from "../controllers/worker.controller";
import { WorkerGenerateAccessTokenController } from "../controllers/workerGenerateAccessToken.controller";
import { WorkerRegisterController } from "../controllers/workerRegister.controller";
import { WorkerUpdateRefreshTokenController } from "../controllers/workerUpdateRefreshToken.controller";

// Router import
import { workerProcessingRouter } from "./workerProcessing.routes";

const workerRegisterController = new WorkerRegisterController();

const workerUpdateRefreshTokenController =
  new WorkerUpdateRefreshTokenController();

const workerGenerateAccessTokenController =
  new WorkerGenerateAccessTokenController();

const workerController = new WorkerController();

const workerRouter = Router();

workerRouter.post(
  "/register",
  validateRequest({
    schema: WorkerRegisterSchema,
    segment: "BODY",
  }),
  workerRegisterController.create,
);

workerRouter.post(
  "/refresh-token",
  validateRequest({
    schema: WorkerRefreshTokenSchema,
    segment: "BODY",
  }),
  workerUpdateRefreshTokenController.update,
);

workerRouter.post(
  "/access-token",
  validateRequest({
    schema: WorkerRefreshTokenSchema,
    segment: "BODY",
  }),
  workerGenerateAccessTokenController.update,
);

workerRouter.get(
  "/",
  workerAuthenticationMiddleware,
  workerAuthenticationGuardMiddleware,
  workerController.show,
);

workerRouter.use(
  "/processing",
  workerAuthenticationMiddleware,
  workerAuthenticationGuardMiddleware,
  workerProcessingRouter,
);

export { workerRouter };
