import { Request, Response } from "express";
import { container } from "tsyringe";

// Service import
import { AdminProcessingCleanExpiredService } from "@modules/adminProcessing/services/adminProcessingCleanExpired.service";

class AdminProcessingCleanExpiredController {
  public async delete(req: Request, res: Response) {
    const adminProcessingCleanExpiredService = container.resolve(
      AdminProcessingCleanExpiredService,
    );

    await adminProcessingCleanExpiredService.execute({
      user: req.user_session.user,
      language: req.language,
    });

    return res.sendStatus(200);
  }
}

export { AdminProcessingCleanExpiredController };
