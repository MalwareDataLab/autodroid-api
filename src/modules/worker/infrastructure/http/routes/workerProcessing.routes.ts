import { Router } from "express";

// Util import
import { validateRequest } from "@shared/infrastructure/http/middlewares/validation.middleware";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";
import { WorkerHandleProcessFailureSchema } from "@modules/worker/schemas/workerHandleProcessFailure.schema";

// Controller import
import { WorkerProcessingController } from "../controllers/workerProcessing.controller";

const workerProcessingController = new WorkerProcessingController();

const workerProcessingRouter = Router();

workerProcessingRouter.get("/:processing_id", workerProcessingController.show);

workerProcessingRouter.post(
  "/:processing_id/progress",
  workerProcessingController.progress,
);

workerProcessingRouter.post(
  "/:processing_id/generate_upload",
  validateRequest({
    schema: RequestFileUploadSignedUrlSchema,
    segment: "BODY",
  }),
  workerProcessingController.generateUploadFile,
);

workerProcessingRouter.post(
  "/:processing_id/uploaded",
  workerProcessingController.handleUploadFile,
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
