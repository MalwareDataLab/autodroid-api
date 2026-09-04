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
  UserDatasetCreateSchema,
  UserDatasetUpdateSchema,
} from "@modules/dataset/schemas/userDataset.schema";

// Controller import
import { UserDatasetController } from "../controllers/userDataset.controller";
import { UserDatasetPublicationController } from "../controllers/userDatasetPublication.controller";

const userDatasetController = new UserDatasetController();
const userDatasetPublicationController = new UserDatasetPublicationController();

const userDatasetRouter = Router();

userDatasetRouter.get(
  "/",
  paginationMiddleware({ segment: "QUERY" }),
  sortingMiddleware<Dataset>({
    segment: "QUERY",
    allowed: DatasetSortingOptions,
  }),
  userDatasetController.index,
);

userDatasetRouter.get("/:dataset_id", userDatasetController.show);

userDatasetRouter.post(
  "/",
  validateRequest({
    schema: UserDatasetCreateSchema,
    segment: "BODY",
  }),
  userDatasetController.create,
);

userDatasetRouter.put(
  "/:dataset_id",
  validateRequest({
    schema: UserDatasetUpdateSchema,
    segment: "BODY",
  }),
  userDatasetController.update,
);
userDatasetRouter.delete("/:dataset_id", userDatasetController.delete);

userDatasetRouter.post(
  "/:dataset_id/request-publication",
  userDatasetPublicationController.update,
);

export { userDatasetRouter };
