import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import {
  UserUpdateDataSchema,
  UserUpdateLearningDataSchema,
} from "@modules/user/schemas/userUpdateData.schema";

// Controller import
import { UserController } from "../controllers/user.controller";
import { UserLearningDataController } from "../controllers/userLearningData.controller";

// Router import
import { userSessionRouter } from "./userSession.routes";

const userController = new UserController();
const userLearningDataController = new UserLearningDataController();

const userRouter = Router();

userRouter.use("/session", userSessionRouter);

userRouter.get("/", userController.show);
userRouter.put(
  "/",
  validateRequest({
    schema: UserUpdateDataSchema,
    segment: "BODY",
  }),
  userController.update,
);

userRouter.patch(
  "/learning-data",
  validateRequest({
    schema: UserUpdateLearningDataSchema,
    segment: "BODY",
  }),
  userLearningDataController.update,
);

export { userRouter };
