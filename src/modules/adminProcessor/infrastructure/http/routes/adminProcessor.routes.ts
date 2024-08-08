import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";

// Schema import
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

// Controller import
import { AdminProcessorController } from "../controllers/adminProcessor.controller";

const adminProcessorRouter = Router();

adminProcessorRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware({ segment: "QUERY" }),
  AdminProcessorController.index,
);

adminProcessorRouter.get("/:processor_id", AdminProcessorController.show);

adminProcessorRouter.post(
  "/",
  validateRequest({
    schema: ProcessorSchema,
    segment: "BODY",
  }),
  AdminProcessorController.create,
);

adminProcessorRouter.put(
  "/:processor_id",
  validateRequest({
    schema: ProcessorSchema,
    segment: "BODY",
  }),
  AdminProcessorController.update,
);

adminProcessorRouter.delete("/:processor_id", AdminProcessorController.delete);

export { adminProcessorRouter };
