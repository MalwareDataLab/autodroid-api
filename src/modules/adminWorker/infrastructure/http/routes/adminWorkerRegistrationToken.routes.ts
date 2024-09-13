import { Router } from "express";

// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";

// Entity import
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

// Schema import
import {
  WorkerRegistrationTokenCreateSchema,
  WorkerRegistrationTokenIndexSchema,
} from "@modules/worker/schemas/workerRegistrationToken.schema";

// Controller import
import { AdminWorkerRegistrationTokenController } from "../controllers/adminWorkerRegistrationToken.controller";

const adminWorkerRegistrationTokenController =
  new AdminWorkerRegistrationTokenController();

const adminWorkerRegistrationTokenRouter = Router();

adminWorkerRegistrationTokenRouter.post(
  "/",
  validateRequest({
    schema: WorkerRegistrationTokenCreateSchema,
    segment: "BODY",
  }),
  adminWorkerRegistrationTokenController.create,
);

adminWorkerRegistrationTokenRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<WorkerRegistrationToken>({
    segment: "QUERY",
    allowed: WorkerRegistrationTokenSortingOptions,
  }),
  validateRequest({
    schema: WorkerRegistrationTokenIndexSchema,
    segment: "QUERY",
  }),
  adminWorkerRegistrationTokenController.index,
);

adminWorkerRegistrationTokenRouter.get(
  "/:worker_registration_token_id",
  adminWorkerRegistrationTokenController.show,
);

adminWorkerRegistrationTokenRouter.delete(
  "/:worker_registration_token_id",
  adminWorkerRegistrationTokenController.delete,
);

export { adminWorkerRegistrationTokenRouter };
