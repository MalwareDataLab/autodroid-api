import { Router } from "express";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

// Schema import
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import { RequestDatasetProcessingSchema } from "@modules/processing/schemas/requestDatasetProcessing.schema";
import { ProcessingUpdateVisibilitySchema } from "@modules/processing/schemas/processingUpdateVisibility.schema";
import { UserProcessingExtendKeepUntilSchema } from "@modules/processing/schemas/processingExtendKeepUntil.schema";

// Controller import
import { UserProcessingController } from "../controllers/userProcessing.controller";
import { UserProcessingExtendKeepUntilController } from "../controllers/userProcessingExtendKeepUntil.controller";
import { UserProcessingUpdateVisibilityController } from "../controllers/userProcessingUpdateVisibility.controller";

const userProcessingController = new UserProcessingController();
const userProcessingExtendKeepUntilController =
  new UserProcessingExtendKeepUntilController();
const userProcessingUpdateVisibilityController =
  new UserProcessingUpdateVisibilityController();

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
  }),
  userProcessingController.index,
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

export { userProcessingRouter };
