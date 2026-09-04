import { Router } from "express";

// Router import
import { adminDatasetRouter } from "@modules/adminDataset/infrastructure/http/routes/adminDataset.routes";
import { adminFileRouter } from "@modules/adminFile/infrastructure/http/routes/adminFile.routes";
import { adminProcessorRouter } from "@modules/adminProcessor/infrastructure/http/routes/adminProcessor.routes";
import { adminProcessingRouter } from "@modules/adminProcessing/infrastructure/http/routes/adminProcessing.routes";
import { adminWorkerRouter } from "@modules/adminWorker/infrastructure/http/routes/adminWorker.routes";

// Middleware import
import { adminAuthenticationMiddleware } from "../middlewares/adminAuthentication.middleware";

const adminRouter = Router();

adminRouter.use(adminAuthenticationMiddleware);

adminRouter.use("/dataset", adminDatasetRouter);
adminRouter.use("/file", adminFileRouter);
adminRouter.use("/processor", adminProcessorRouter);
adminRouter.use("/processing", adminProcessingRouter);
adminRouter.use("/worker", adminWorkerRouter);

export { adminRouter };
