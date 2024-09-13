import { Router } from "express";

// Middleware import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import { UserUpdateDataSchema } from "@modules/user/schemas/userUpdateData.schema";

// Controller import
import { UserController } from "../controllers/user.controller";

// Router import
import { userSessionRouter } from "./userSession.routes";

const userController = new UserController();

const userRouter = Router();

userRouter.use("/session", userSessionRouter);

userRouter.get("/", userController.get);
userRouter.put(
  "/",
  validateRequest({
    schema: UserUpdateDataSchema,
    segment: "BODY",
  }),
  userController.update,
);

export { userRouter };
