import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminProcessingIndexService } from "@modules/adminProcessing/services/adminProcessingIndex.service";
import { AdminProcessingShowService } from "@modules/adminProcessing/services/adminProcessingShow.service";
import { AdminProcessingUpdateService } from "@modules/adminProcessing/services/adminProcessingUpdate.service";
import { AdminProcessingDeleteService } from "@modules/adminProcessing/services/adminProcessingDelete.service";

class AdminProcessingController {
  public async index(req: Request, res: Response) {
    const adminProcessingIndexService = container.resolve(
      AdminProcessingIndexService,
    );
    const processing = await adminProcessingIndexService.execute({
      filter: req.query,
      user: req.session.user,
    });
    return res.json(process(processing));
  }

  public async show(req: Request, res: Response) {
    const adminProcessingShowService = container.resolve(
      AdminProcessingShowService,
    );
    const processing = await adminProcessingShowService.execute({
      processing_id: req.params.processing_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processing));
  }

  public async update(req: Request, res: Response) {
    const adminProcessingUpdateService = container.resolve(
      AdminProcessingUpdateService,
    );
    const processing = await adminProcessingUpdateService.execute({
      processing_id: req.params.processing_id,
      data: req.body,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processing));
  }

  public async delete(req: Request, res: Response) {
    const adminProcessingDeleteService = container.resolve(
      AdminProcessingDeleteService,
    );
    const processing = await adminProcessingDeleteService.execute({
      processing_id: req.params.processing_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processing));
  }
}

export { AdminProcessingController };
