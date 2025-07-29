import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserProcessingExtendKeepUntilService } from "@modules/processing/services/userProcessingExtendKeepUntil.service";

class UserProcessingExtendKeepUntilController {
  public async update(req: Request, res: Response) {
    const userProcessingExtendKeepUntilService = container.resolve(
      UserProcessingExtendKeepUntilService,
    );

    const processing = await userProcessingExtendKeepUntilService.execute({
      processing_id: req.params.processing_id,
      keep_until: req.body.keep_until,

      user: req.user_session.user,
      language: req.language,
    });

    return res.json(process(processing));
  }
}

export { UserProcessingExtendKeepUntilController };
