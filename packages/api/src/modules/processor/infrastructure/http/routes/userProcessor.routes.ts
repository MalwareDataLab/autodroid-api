import { Router } from "express";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Middleware import
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";

// Controller import
import { UserProcessorController } from "../controllers/userProcessor.controller";

const userProcessorController = new UserProcessorController();

const userProcessorRouter = Router();

userProcessorRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<Processor>({
    segment: "QUERY",
    allowed: ProcessorSortingOptions,
  }),
  userProcessorController.index,
);

userProcessorRouter.get("/:processor_id", userProcessorController.show);

export { userProcessorRouter };
