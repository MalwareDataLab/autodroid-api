import { Router } from "express";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";

// Schema import
import { ProcessorSchema } from "@modules/processor/schemas/processor.schema";

// Controller import
import { AdminProcessorController } from "../controllers/adminProcessor.controller";

const adminProcessorController = new AdminProcessorController();

const adminProcessorRouter = Router();

adminProcessorRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<Processor>({
    segment: "QUERY",
    allowed: ProcessorSortingOptions,
  }),
  adminProcessorController.index,
);

adminProcessorRouter.get("/:processor_id", adminProcessorController.show);

adminProcessorRouter.post(
  "/",
  validateRequest({
    schema: ProcessorSchema,
    segment: "BODY",
  }),
  adminProcessorController.create,
);

adminProcessorRouter.put(
  "/:processor_id",
  validateRequest({
    schema: ProcessorSchema,
    segment: "BODY",
  }),
  adminProcessorController.update,
);

adminProcessorRouter.delete("/:processor_id", adminProcessorController.delete);

export { adminProcessorRouter };
