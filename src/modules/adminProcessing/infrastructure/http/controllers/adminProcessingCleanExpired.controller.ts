import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminProcessingCleanExpiredService } from "@modules/adminProcessing/services/adminProcessingCleanExpired.service";

class AdminProcessingCleanExpiredController {
  public async delete(req: Request, res: Response) {
    const adminProcessingCleanExpiredService = container.resolve(
      AdminProcessingCleanExpiredService,
    );
    const processing = await adminProcessingCleanExpiredService.execute({
      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processing));
  }
}

export { AdminProcessingCleanExpiredController };
