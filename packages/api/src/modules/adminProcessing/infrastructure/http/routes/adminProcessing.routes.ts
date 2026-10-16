import { Router } from "express";

// Middleware import
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Constant import
import { PAGINATION_QUERY_KEYS } from "@modules/pagination/constants/paginationQueryKeys.constant";
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";
import { SORTING_QUERY_KEYS } from "@modules/sorting/constants/sortingQueryKeys.constant";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

// Schema import
import {
  AdminProcessingIndexSchema,
  AdminProcessingUpdateSchema,
  AdminProcessingFailDanglingSchema,
} from "@modules/adminProcessing/schemas/adminProcessing.schema";
import { AdminProcessingGetEstimatedExecutionTimeSchema } from "@modules/adminProcessing/schemas/adminProcessingEstimatedExecutionTime.schema";

// Controller import
import { AdminProcessingController } from "../controllers/adminProcessing.controller";
import { AdminProcessingCleanExpiredController } from "../controllers/adminProcessingCleanExpired.controller";
import { AdminProcessingFailDanglingController } from "../controllers/adminProcessingFailDangling.controller";
import { AdminProcessingTimeEstimationController } from "../controllers/adminProcessingTimeEstimation.controller";

const adminProcessingController = new AdminProcessingController();
const adminProcessingCleanExpiredController =
  new AdminProcessingCleanExpiredController();
const adminProcessingFailDanglingController =
  new AdminProcessingFailDanglingController();
const adminProcessingTimeEstimationController =
  new AdminProcessingTimeEstimationController();

const adminProcessingRouter = Router();

adminProcessingRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<Processing>({
    segment: "QUERY",
    allowed: ProcessingSortingOptions,
  }),
  validateRequest({
    schema: AdminProcessingIndexSchema,
    segment: "QUERY",
    ignoreKeys: [...PAGINATION_QUERY_KEYS, ...SORTING_QUERY_KEYS],
  }),
  adminProcessingController.index,
);
adminProcessingRouter.get(
  "/estimated-execution-time",
  validateRequest({
    schema: AdminProcessingGetEstimatedExecutionTimeSchema,
    segment: "QUERY",
  }),
  adminProcessingTimeEstimationController.showEstimatedExecution,
);

adminProcessingRouter.get("/:processing_id", adminProcessingController.show);

adminProcessingRouter.put(
  "/:processing_id",
  validateRequest({
    schema: AdminProcessingUpdateSchema,
    segment: "BODY",
  }),
  adminProcessingController.update,
);

adminProcessingRouter.delete(
  "/clean-expired",
  adminProcessingCleanExpiredController.delete,
);

adminProcessingRouter.patch(
  "/fail-dangling",
  validateRequest({
    schema: AdminProcessingFailDanglingSchema,
    segment: "BODY",
  }),
  adminProcessingFailDanglingController.update,
);

adminProcessingRouter.delete(
  "/:processing_id",
  adminProcessingController.delete,
);

export { adminProcessingRouter };
