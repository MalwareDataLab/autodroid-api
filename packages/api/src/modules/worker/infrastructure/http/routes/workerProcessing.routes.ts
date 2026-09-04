import { Router } from "express";

// Util import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";
import { WorkerHandleProcessFailureSchema } from "@modules/worker/schemas/workerHandleProcessFailure.schema";

// Controller import
import { WorkerProcessingController } from "../controllers/workerProcessing.controller";
import { WorkerProcessingResultFileController } from "../controllers/workerProcessingResultFile.controller";
import { WorkerProcessingMetricsFileController } from "../controllers/workerProcessingMetricsFile.controller";

const workerProcessingController = new WorkerProcessingController();
const workerProcessingResultFileController =
  new WorkerProcessingResultFileController();
const workerProcessingMetricsFileController =
  new WorkerProcessingMetricsFileController();

const workerProcessingRouter = Router();

workerProcessingRouter.get("/:processing_id", workerProcessingController.show);

workerProcessingRouter.post(
  "/:processing_id/progress",
  workerProcessingController.progress,
);

workerProcessingRouter.post(
  "/:processing_id/result_file/generate_upload",
  validateRequest({
    schema: RequestFileUploadSignedUrlSchema,
    segment: "BODY",
  }),
  workerProcessingResultFileController.create,
);

workerProcessingRouter.post(
  "/:processing_id/result_file/uploaded",
  workerProcessingResultFileController.update,
);

workerProcessingRouter.post(
  "/:processing_id/metrics_file/generate_upload",
  validateRequest({
    schema: RequestFileUploadSignedUrlSchema,
    segment: "BODY",
  }),
  workerProcessingMetricsFileController.create,
);

workerProcessingRouter.post(
  "/:processing_id/metrics_file/uploaded",
  workerProcessingMetricsFileController.update,
);

workerProcessingRouter.post(
  "/:processing_id/success",
  workerProcessingController.success,
);

workerProcessingRouter.post(
  "/:processing_id/failure",
  validateRequest({
    schema: WorkerHandleProcessFailureSchema,
    segment: "BODY",
  }),
  workerProcessingController.failure,
);

export { workerProcessingRouter };
