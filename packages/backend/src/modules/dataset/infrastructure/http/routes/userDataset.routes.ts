import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import {
  UserDatasetCreateSchema,
  UserDatasetUpdateSchema,
} from "@modules/dataset/schemas/userDataset.schema";

// Controller import
import { UserDatasetController } from "../controllers/userDataset.controller";
import { UserDatasetPublicationController } from "../controllers/userDatasetPublication.controller";

const userDatasetRouter = Router();

userDatasetRouter.post(
  "/",
  validateRequest({
    schema: UserDatasetCreateSchema,
    segment: "BODY",
  }),
  UserDatasetController.create,
);
userDatasetRouter.get("/", UserDatasetController.index);
userDatasetRouter.get("/:dataset_id", UserDatasetController.show);

userDatasetRouter.put(
  "/:dataset_id",
  validateRequest({
    schema: UserDatasetUpdateSchema,
    segment: "BODY",
  }),
  UserDatasetController.update,
);
userDatasetRouter.delete("/:dataset_id", UserDatasetController.delete);

userDatasetRouter.post(
  "/:dataset_id/request-publication",
  UserDatasetPublicationController.update,
);

export { userDatasetRouter };
