import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserProcessingGetEstimatedExecutionTimeService } from "@modules/processing/services/userProcessingGetEstimatedExecutionTime.service";
import { UserProcessingGetEstimatedFinishDateService } from "@modules/processing/services/userProcessingGetEstimatedFinishDate.service";

class UserProcessingTimeEstimationController {
  public async showEstimatedExecution(req: Request, res: Response) {
    const userProcessingGetEstimatedExecutionTimeService = container.resolve(
      UserProcessingGetEstimatedExecutionTimeService,
    );

    const processingTimeEstimation =
      await userProcessingGetEstimatedExecutionTimeService.execute({
        user: req.user_session.user,

        dataset_id: String(req.query.dataset_id),
        processor_id: String(req.query.processor_id),

        language: req.language,
      });

    return res.json(process(processingTimeEstimation));
  }

  public async showEstimatedFinish(req: Request, res: Response) {
    const userProcessingGetEstimatedFinishDateService = container.resolve(
      UserProcessingGetEstimatedFinishDateService,
    );

    const processingEstimatedFinish =
      await userProcessingGetEstimatedFinishDateService.execute({
        user: req.user_session.user,

        processing_id: String(req.params.processing_id),

        language: req.language,
      });

    return res.json(process(processingEstimatedFinish));
  }
}

export { UserProcessingTimeEstimationController };
