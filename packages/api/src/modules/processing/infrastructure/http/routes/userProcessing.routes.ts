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
import { UserProcessingExtendKeepUntilSchema } from "@modules/processing/schemas/processingExtendKeepUntil.schema";
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import {
  ProcessingGetEstimatedExecutionTimeSchema,
  ProcessingGetEstimatedFinishTimeSchema,
} from "@modules/processing/schemas/processingTimeEstimation.schema";
import { ProcessingUpdateVisibilitySchema } from "@modules/processing/schemas/processingUpdateVisibility.schema";
import { RequestDatasetProcessingSchema } from "@modules/processing/schemas/requestDatasetProcessing.schema";

// Controller import
import { UserProcessingController } from "../controllers/userProcessing.controller";
import { UserProcessingExtendKeepUntilController } from "../controllers/userProcessingExtendKeepUntil.controller";
import { UserProcessingTimeEstimationController } from "../controllers/userProcessingTimeEstimation.controller";
import { UserProcessingUpdateVisibilityController } from "../controllers/userProcessingUpdateVisibility.controller";

const userProcessingController = new UserProcessingController();
const userProcessingExtendKeepUntilController =
  new UserProcessingExtendKeepUntilController();
const userProcessingUpdateVisibilityController =
  new UserProcessingUpdateVisibilityController();
const userProcessingTimeEstimationController =
  new UserProcessingTimeEstimationController();

const userProcessingRouter = Router();

userProcessingRouter.post(
  "/",
  validateRequest({
    schema: RequestDatasetProcessingSchema,
    segment: "BODY",
  }),
  userProcessingController.create,
);

userProcessingRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<Processing>({
    segment: "QUERY",
    allowed: ProcessingSortingOptions,
  }),
  validateRequest({
    schema: ProcessingIndexSchema,
    segment: "QUERY",
    ignoreKeys: [...PAGINATION_QUERY_KEYS, ...SORTING_QUERY_KEYS],
  }),
  userProcessingController.index,
);

userProcessingRouter.get(
  "/estimated-execution-time",
  validateRequest({
    schema: ProcessingGetEstimatedExecutionTimeSchema,
    segment: "QUERY",
  }),
  userProcessingTimeEstimationController.showEstimatedExecution,
);

userProcessingRouter.get("/:processing_id", userProcessingController.show);

userProcessingRouter.delete("/:processing_id", userProcessingController.delete);

userProcessingRouter.patch(
  "/:processing_id/extend-keep-until",
  validateRequest({
    schema: UserProcessingExtendKeepUntilSchema,
    segment: "BODY",
  }),
  userProcessingExtendKeepUntilController.update,
);

userProcessingRouter.patch(
  "/:processing_id/update-visibility",
  validateRequest({
    schema: ProcessingUpdateVisibilitySchema,
    segment: "BODY",
  }),
  userProcessingUpdateVisibilityController.update,
);

userProcessingRouter.get(
  "/:processing_id/estimated-finish-time",
  validateRequest({
    schema: ProcessingGetEstimatedFinishTimeSchema,
    segment: "PARAMS",
  }),
  userProcessingTimeEstimationController.showEstimatedFinish,
);

export { userProcessingRouter };
