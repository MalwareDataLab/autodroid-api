import { Router } from "express";

// Middleware import
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Constant import
import { PAGINATION_QUERY_KEYS } from "@modules/pagination/constants/paginationQueryKeys.constant";
import { SORTING_QUERY_KEYS } from "@modules/sorting/constants/sortingQueryKeys.constant";
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";

// Schema import
import { AdminWorkerUpdateSchema } from "@modules/adminWorker/schemas/adminWorkerUpdate.schema";
import { WorkerIndexSchema } from "@modules/worker/schemas/worker.schema";

// Controller import
import { AdminWorkerController } from "../controllers/adminWorker.controller";
import { AdminWorkerCleanMissingController } from "../controllers/adminWorkerCleanMissing.controller";

// Router import
import { adminWorkerRegistrationTokenRouter } from "./adminWorkerRegistrationToken.routes";

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
    ignoreKeys: [...PAGINATION_QUERY_KEYS, ...SORTING_QUERY_KEYS],
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
