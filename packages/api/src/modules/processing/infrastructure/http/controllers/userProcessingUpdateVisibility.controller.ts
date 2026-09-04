import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserProcessingUpdateVisibilityService } from "@modules/processing/services/userProcessingUpdateVisibility.service";

class UserProcessingUpdateVisibilityController {
  public async update(req: Request, res: Response) {
    const userProcessingUpdateVisibilityService = container.resolve(
      UserProcessingUpdateVisibilityService,
    );

    const processing = await userProcessingUpdateVisibilityService.execute({
      processing_id: req.params.processing_id,
      visibility: req.body.visibility,

      user: req.user_session.user,
      language: req.language,
    });

    return res.json(process(processing));
  }
}

export { UserProcessingUpdateVisibilityController };
