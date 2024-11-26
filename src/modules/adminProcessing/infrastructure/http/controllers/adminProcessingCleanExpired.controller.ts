import { container } from "tsyringe";
import { Request, Response } from "express";

// Service import
import { AdminProcessingCleanExpiredService } from "@modules/adminProcessing/services/adminProcessingCleanExpired.service";

class AdminProcessingCleanExpiredController {
  public async delete(req: Request, res: Response) {
    const adminProcessingCleanExpiredService = container.resolve(
      AdminProcessingCleanExpiredService,
    );

    await adminProcessingCleanExpiredService.execute({
      user: req.session.user,
      language: req.language,
    });

    return res.sendStatus(200);
  }
}

export { AdminProcessingCleanExpiredController };
