import { Router } from "express";

// Controller import
import { UserSessionController } from "../controllers/userSession.controller";

const userSessionRouter = Router();

userSessionRouter.get("/", UserSessionController.get);
userSessionRouter.delete("/", UserSessionController.delete);

export { userSessionRouter };
