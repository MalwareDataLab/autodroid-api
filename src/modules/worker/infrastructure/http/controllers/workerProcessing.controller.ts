import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerProcessingShowService } from "@modules/worker/services/workerProcessingShow.service";
import { WorkerHandleProcessSuccessService } from "@modules/worker/services/workerHandleProcessSuccess.service";
import { WorkerHandleProcessFailureService } from "@modules/worker/services/workerHandleProcessFailure.service";
import { WorkerHandleProcessProgressService } from "@modules/worker/services/workerHandleProcessProgress.service";
import { WorkerHandleProcessUploadFileService } from "@modules/worker/services/workerHandleProcessUploadFile.service";
import { WorkerGenerateProcessUploadFileService } from "@modules/worker/services/workerGenerateProcessUploadFile.service";

class WorkerProcessingController {
  public async show(req: Request, res: Response) {
    const workerProcessingShowService = container.resolve(
      WorkerProcessingShowService,
    );

    const processing = await workerProcessingShowService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
    });

    return res.json(process(processing));
  }

  public async progress(req: Request, res: Response) {
    const workerHandleProcessProgressService = container.resolve(
      WorkerHandleProcessProgressService,
    );

    const processing = await workerHandleProcessProgressService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
    });

    return res.json(process(processing));
  }

  public async generateUploadFile(req: Request, res: Response) {
    const workerGenerateProcessUploadFileService = container.resolve(
      WorkerGenerateProcessUploadFileService,
    );

    const processing = await workerGenerateProcessUploadFileService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
      data: req.body,
      agent_info: req.agent_info,
    });

    return res.json(process(processing));
  }

  public async handleUploadFile(req: Request, res: Response) {
    const workerHandleProcessUploadFileService = container.resolve(
      WorkerHandleProcessUploadFileService,
    );

    const processing = await workerHandleProcessUploadFileService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
    });

    return res.json(process(processing));
  }

  public async success(req: Request, res: Response) {
    const workerHandleProcessSuccessService = container.resolve(
      WorkerHandleProcessSuccessService,
    );

    const processing = await workerHandleProcessSuccessService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
    });

    return res.json(process(processing));
  }

  public async failure(req: Request, res: Response) {
    const workerHandleProcessFailureService = container.resolve(
      WorkerHandleProcessFailureService,
    );

    const processing = await workerHandleProcessFailureService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
      data: req.body,
    });

    return res.json(process(processing));
  }
}

export { WorkerProcessingController };
