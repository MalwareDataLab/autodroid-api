import { Router } from "express";

// Constant import
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";

// Schema import
import { WorkerIndexSchema } from "@modules/worker/schemas/worker.schema";
import { AdminWorkerUpdateSchema } from "@modules/adminWorker/schemas/adminWorkerUpdate.schema";

// Router import
import { adminWorkerRegistrationTokenRouter } from "./adminWorkerRegistrationToken.routes";

// Controller import
import { AdminWorkerController } from "../controllers/adminWorker.controller";
import { AdminWorkerCleanMissingController } from "../controllers/adminWorkerCleanMissing.controller";

const adminWorkerController = new AdminWorkerController();
const adminWorkerCleanMissingController =
  new AdminWorkerCleanMissingController();

const adminWorkerRouter = Router();

adminWorkerRouter.use(
  "/registration-token",
  adminWorkerRegistrationTokenRouter,
);

adminWorkerRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<Worker>({
    segment: "QUERY",
    allowed: WorkerSortingOptions,
  }),
  validateRequest({
    schema: WorkerIndexSchema,
    segment: "QUERY",
  }),
  adminWorkerController.index,
);

adminWorkerRouter.get("/:worker_id", adminWorkerController.show);

adminWorkerRouter.put(
  "/:worker_id",
  validateRequest({
    schema: AdminWorkerUpdateSchema,
    segment: "BODY",
  }),
  adminWorkerController.update,
);

adminWorkerRouter.delete(
  "/clean-missing",
  adminWorkerCleanMissingController.delete,
);

adminWorkerRouter.delete("/:worker_id", adminWorkerController.delete);

export { adminWorkerRouter };
