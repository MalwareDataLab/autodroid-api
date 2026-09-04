import { Router } from "express";

// Controller import
import { UserSessionController } from "../controllers/userSession.controller";

const userSessionController = new UserSessionController();

const userSessionRouter = Router();

userSessionRouter.get("/", userSessionController.get);
userSessionRouter.delete("/", userSessionController.delete);

export { userSessionRouter };
