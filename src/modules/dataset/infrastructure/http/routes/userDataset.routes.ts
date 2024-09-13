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

const userDatasetController = new UserDatasetController();
const userDatasetPublicationController = new UserDatasetPublicationController();

const userDatasetRouter = Router();

userDatasetRouter.post(
  "/",
  validateRequest({
    schema: UserDatasetCreateSchema,
    segment: "BODY",
  }),
  userDatasetController.create,
);
userDatasetRouter.get("/", userDatasetController.index);
userDatasetRouter.get("/:dataset_id", userDatasetController.show);

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
