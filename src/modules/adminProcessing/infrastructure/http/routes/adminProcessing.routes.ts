import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import {
  AdminProcessingIndexSchema,
  AdminProcessingUpdateSchema,
  AdminProcessingFailDanglingSchema,
} from "@modules/adminProcessing/schemas/adminProcessing.schema";

// Controller import
import { AdminProcessingController } from "../controllers/adminProcessing.controller";
import { AdminProcessingCleanExpiredController } from "../controllers/adminProcessingCleanExpired.controller";
import { AdminProcessingFailDanglingController } from "../controllers/adminProcessingFailDangling.controller";

const adminProcessingController = new AdminProcessingController();
const adminProcessingCleanExpiredController =
  new AdminProcessingCleanExpiredController();
const adminProcessingFailDanglingController =
  new AdminProcessingFailDanglingController();

const adminProcessingRouter = Router();

adminProcessingRouter.get(
  "/",
  validateRequest({
    schema: AdminProcessingIndexSchema,
    segment: "QUERY",
  }),
  adminProcessingController.index,
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
