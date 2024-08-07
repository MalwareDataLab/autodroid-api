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

const adminDatasetRouter = Router();

adminDatasetRouter.get(
  "/",
  validateRequest({
    schema: AdminDatasetIndexSchema,
    segment: "QUERY",
  }),
  AdminDatasetController.index,
);
adminDatasetRouter.get("/:dataset_id", AdminDatasetController.show);

adminDatasetRouter.put(
  "/:dataset_id",
  validateRequest({
    schema: AdminDatasetUpdateSchema,
    segment: "BODY",
  }),
  AdminDatasetController.update,
);
adminDatasetRouter.delete("/:dataset_id", AdminDatasetController.delete);

adminDatasetRouter.post(
  "/:dataset_id/update-visibility",
  validateRequest({
    schema: AdminDatasetUpdateVisibilitySchema,
    segment: "BODY",
  }),
  AdminDatasetVisibilityController.update,
);

export { adminDatasetRouter };
