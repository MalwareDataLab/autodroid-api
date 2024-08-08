import { Router } from "express";

// Middleware import
import { paginationMiddleware } from "@modules/pagination/infrastructure/http/middlewares/pagination.middleware";
import { sortingMiddleware } from "@modules/sorting/infrastructure/http/middlewares/sorting.middleware";

// Controller import
import { UserProcessorController } from "../controllers/userProcessor.controller";

const userProcessorRouter = Router();

userProcessorRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware({ segment: "QUERY" }),
  UserProcessorController.index,
);

userProcessorRouter.get("/:processor_id", UserProcessorController.show);

export { userProcessorRouter };
