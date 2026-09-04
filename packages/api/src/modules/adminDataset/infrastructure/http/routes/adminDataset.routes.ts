import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Schema import
import {
  AdminDatasetIndexSchema,
  AdminDatasetUpdateSchema,
  AdminDatasetUpdateVisibilitySchema,
} from "@modules/adminDataset/schemas/adminDataset.schema";

// Controller import
import { AdminDatasetController } from "../controllers/adminDataset.controller";
import { AdminDatasetVisibilityController } from "../controllers/adminDatasetVisibility.controller";

const adminDatasetController = new AdminDatasetController();
const adminDatasetVisibilityController = new AdminDatasetVisibilityController();

const adminDatasetRouter = Router();

adminDatasetRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<Dataset>({
    segment: "QUERY",
    allowed: DatasetSortingOptions,
  }),
  validateRequest({
    schema: AdminDatasetIndexSchema,
    segment: "QUERY",
  }),
  adminDatasetController.index,
);

adminDatasetRouter.get("/:dataset_id", adminDatasetController.show);

adminDatasetRouter.put(
  "/:dataset_id",
  validateRequest({
    schema: AdminDatasetUpdateSchema,
    segment: "BODY",
  }),
  adminDatasetController.update,
);
adminDatasetRouter.delete("/:dataset_id", adminDatasetController.delete);

adminDatasetRouter.patch(
  "/:dataset_id/update-visibility",
  validateRequest({
    schema: AdminDatasetUpdateVisibilitySchema,
    segment: "BODY",
  }),
  adminDatasetVisibilityController.update,
);

export { adminDatasetRouter };
