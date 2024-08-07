import { Router } from "express";

// Router import
import { adminDatasetRouter } from "@modules/adminDataset/infrastructure/http/routes/adminDataset.routes";

// Middleware import
import { adminAuthenticationMiddleware } from "../middlewares/adminAuthentication.middleware";

const adminRouter = Router();

adminRouter.use(adminAuthenticationMiddleware);

adminRouter.use("/dataset", adminDatasetRouter);

export { adminRouter };
