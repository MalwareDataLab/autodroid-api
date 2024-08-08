import { Router } from "express";

// Middleware import
import { userAuthenticationMiddleware } from "@modules/user/infrastructure/http/middlewares/userAuthentication.middleware";

// Router import
import { healthCheckRouter } from "@modules/healthcheck/infrastructure/http/routes/healthCheck.routes";
import { adminRouter } from "@modules/admin/infrastructure/http/routes/admin.router";
import { userRouter } from "@modules/user/infrastructure/http/routes/user.routes";
import { userDatasetRouter } from "@modules/dataset/infrastructure/http/routes/userDataset.routes";
import { userProcessorRouter } from "@modules/processor/infrastructure/http/routes/userProcessor.routes";

const router = Router();

router.use("/health", healthCheckRouter);

router.use("/admin", userAuthenticationMiddleware, adminRouter);

router.use("/user", userAuthenticationMiddleware, userRouter);
router.use("/dataset", userAuthenticationMiddleware, userDatasetRouter);
router.use("/processor", userAuthenticationMiddleware, userProcessorRouter);

export { router };
