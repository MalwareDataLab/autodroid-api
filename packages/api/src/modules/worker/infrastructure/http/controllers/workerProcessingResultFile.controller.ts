import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerHandleProcessingResultUploadFileService } from "@modules/worker/services/workerHandleProcessingResultUploadFile.service";
import { WorkerGenerateProcessingResultUploadFileService } from "@modules/worker/services/workerGenerateProcessingResultUploadFile.service";

class WorkerProcessingResultFileController {
  public async create(req: Request, res: Response) {
    const workerGenerateProcessingResultUploadFileService = container.resolve(
      WorkerGenerateProcessingResultUploadFileService,
    );

    const resultFile =
      await workerGenerateProcessingResultUploadFileService.execute({
        worker: req.worker_session.worker,
        processing_id: req.params.processing_id,
        data: req.body,
        agent_info: req.agent_info,
      });

    return res.json(process(resultFile));
  }

  public async update(req: Request, res: Response) {
    const workerHandleProcessingResultUploadFileService = container.resolve(
      WorkerHandleProcessingResultUploadFileService,
    );

    const resultFile =
      await workerHandleProcessingResultUploadFileService.execute({
        worker: req.worker_session.worker,
        processing_id: req.params.processing_id,
      });

    return res.json(process(resultFile));
  }
}

export { WorkerProcessingResultFileController };
