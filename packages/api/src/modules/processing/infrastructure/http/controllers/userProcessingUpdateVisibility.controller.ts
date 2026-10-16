import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { withVisibleProcessingOwners } from "@modules/processing/utils/withVisibleProcessingOwners.util";
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

    return res.json(
      process(withVisibleProcessingOwners(processing, req.user_session)),
    );
  }
}

export { UserProcessingUpdateVisibilityController };
