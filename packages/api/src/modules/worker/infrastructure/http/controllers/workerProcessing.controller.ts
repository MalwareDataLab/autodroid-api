import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerProcessingShowService } from "@modules/worker/services/workerProcessingShow.service";
import { WorkerHandleProcessingSuccessService } from "@modules/worker/services/workerHandleProcessingSuccess.service";
import { WorkerHandleProcessingFailureService } from "@modules/worker/services/workerHandleProcessingFailure.service";
import { WorkerHandleProcessingProgressService } from "@modules/worker/services/workerHandleProcessingProgress.service";

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
    const workerHandleProcessingProgressService = container.resolve(
      WorkerHandleProcessingProgressService,
    );

    const processing = await workerHandleProcessingProgressService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
    });

    return res.json(process(processing));
  }

  public async success(req: Request, res: Response) {
    const workerHandleProcessingSuccessService = container.resolve(
      WorkerHandleProcessingSuccessService,
    );

    const processing = await workerHandleProcessingSuccessService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
    });

    return res.json(process(processing));
  }

  public async failure(req: Request, res: Response) {
    const workerHandleProcessingFailureService = container.resolve(
      WorkerHandleProcessingFailureService,
    );

    const processing = await workerHandleProcessingFailureService.execute({
      worker: req.worker_session.worker,
      processing_id: req.params.processing_id,
      data: req.body,
    });

    return res.json(process(processing));
  }
}

export { WorkerProcessingController };
