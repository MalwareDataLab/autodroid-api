import { Router } from "express";

// Util import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import {
  WorkerRefreshTokenSchema,
  WorkerRegisterSchema,
} from "@modules/worker/schemas/worker.schema";

// Controller import
import { WorkerRegisterController } from "../controllers/workerRegister.controller";
import { WorkerUpdateRefreshTokenController } from "../controllers/workerUpdateRefreshToken.controller";
import { WorkerGenerateAccessTokenController } from "../controllers/workerGenerateAccessToken.controller";

const workerRegisterController = new WorkerRegisterController();

const workerUpdateRefreshTokenController =
  new WorkerUpdateRefreshTokenController();

const workerGenerateAccessTokenController =
  new WorkerGenerateAccessTokenController();

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

export { workerRouter };
