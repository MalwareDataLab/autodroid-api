import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

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

adminDatasetRouter.post(
  "/:dataset_id/update-visibility",
  validateRequest({
    schema: AdminDatasetUpdateVisibilitySchema,
    segment: "BODY",
  }),
  adminDatasetVisibilityController.update,
);

export { adminDatasetRouter };
