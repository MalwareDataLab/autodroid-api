import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerHandleProcessingMetricsUploadFileService } from "@modules/worker/services/workerHandleProcessingMetricsUploadFile.service";
import { WorkerGenerateProcessingMetricsUploadFileService } from "@modules/worker/services/workerGenerateProcessingMetricsUploadFile.service";

class WorkerProcessingMetricsFileController {
  public async create(req: Request, res: Response) {
    const workerGenerateProcessingMetricsUploadFileService = container.resolve(
      WorkerGenerateProcessingMetricsUploadFileService,
    );

    const metricsFile =
      await workerGenerateProcessingMetricsUploadFileService.execute({
        worker: req.worker_session.worker,
        processing_id: req.params.processing_id,
        data: req.body,
        agent_info: req.agent_info,
      });

    return res.json(process(metricsFile));
  }

  public async update(req: Request, res: Response) {
    const workerHandleProcessingMetricsUploadFileService = container.resolve(
      WorkerHandleProcessingMetricsUploadFileService,
    );

    const metricsFile =
      await workerHandleProcessingMetricsUploadFileService.execute({
        worker: req.worker_session.worker,
        processing_id: req.params.processing_id,
      });

    return res.json(process(metricsFile));
  }
}

export { WorkerProcessingMetricsFileController };
