import { Router } from "express";

// Router import
import { adminDatasetRouter } from "@modules/adminDataset/infrastructure/http/routes/adminDataset.routes";
import { adminProcessorRouter } from "@modules/adminProcessor/infrastructure/http/routes/adminProcessor.routes";

// Middleware import
import { adminAuthenticationMiddleware } from "../middlewares/adminAuthentication.middleware";

const adminRouter = Router();

adminRouter.use(adminAuthenticationMiddleware);

adminRouter.use("/dataset", adminDatasetRouter);
adminRouter.use("/processor", adminProcessorRouter);

export { adminRouter };
