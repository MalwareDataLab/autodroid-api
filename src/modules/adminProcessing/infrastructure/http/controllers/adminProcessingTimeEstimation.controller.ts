import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminProcessingEstimatedExecutionTimeIndexService } from "@modules/adminProcessing/services/adminProcessingEstimatedExecutionTimeIndex.service";

class AdminProcessingTimeEstimationController {
  public async showEstimatedExecution(req: Request, res: Response) {
    const adminProcessingGetEstimatedExecutionTimeService = container.resolve(
      AdminProcessingEstimatedExecutionTimeIndexService,
    );

    const processingTimeEstimation =
      await adminProcessingGetEstimatedExecutionTimeService.execute({
        user: req.session.user,

        filter: {
          dataset_id: String(req.query.dataset_id),
          processor_id: String(req.query.processor_id),
        },

        language: req.language,
      });

    return res.json(process(processingTimeEstimation));
  }
}

export { AdminProcessingTimeEstimationController };
