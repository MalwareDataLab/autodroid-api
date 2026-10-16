import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminDatasetUpdateVisibilityService } from "@modules/adminDataset/services/adminDatasetUpdateVisibility.service";

class AdminDatasetVisibilityController {
  public async update(req: Request, res: Response) {
    const adminDatasetUpdateVisibilityService = container.resolve(
      AdminDatasetUpdateVisibilityService,
    );
    const dataset = await adminDatasetUpdateVisibilityService.execute({
      dataset_id: req.params.dataset_id,
      data: req.body,

      user: req.user_session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }
}

export { AdminDatasetVisibilityController };
