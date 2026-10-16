import { Router } from "express";

// Middleware import
import { userAuthenticationMiddleware } from "@modules/user/infrastructure/http/middlewares/userAuthentication.middleware";

// Router import
import { adminRouter } from "@modules/admin/infrastructure/http/routes/admin.routes";
import { cliAuthorizationRouter } from "@modules/cliAuthorization/infrastructure/http/routes/cliAuthorization.routes";
import { userDatasetRouter } from "@modules/dataset/infrastructure/http/routes/userDataset.routes";
import { healthCheckRouter } from "@modules/healthCheck/infrastructure/http/routes/healthCheck.routes";
import { mcpAuthorizationRequestRouter } from "@modules/mcpAuthorization/infrastructure/http/routes/mcpAuthorizationRequest.routes";
import { userProcessingRouter } from "@modules/processing/infrastructure/http/routes/userProcessing.routes";
import { userProcessorRouter } from "@modules/processor/infrastructure/http/routes/userProcessor.routes";
import { userRouter } from "@modules/user/infrastructure/http/routes/user.routes";
import { workerRouter } from "@modules/worker/infrastructure/http/routes/worker.routes";

const router = Router();

router.use("/health", healthCheckRouter);

router.use("/worker", workerRouter);

router.use("/cli-auth", cliAuthorizationRouter);

router.use("/mcp-auth", mcpAuthorizationRequestRouter);

router.use("/admin", userAuthenticationMiddleware, adminRouter);

router.use("/user", userAuthenticationMiddleware, userRouter);
router.use("/processor", userAuthenticationMiddleware, userProcessorRouter);
router.use("/dataset", userAuthenticationMiddleware, userDatasetRouter);
router.use("/processing", userAuthenticationMiddleware, userProcessingRouter);

export { router };
