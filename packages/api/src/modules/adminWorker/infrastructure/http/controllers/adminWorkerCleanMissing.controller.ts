import { Request, Response } from "express";
import { container } from "tsyringe";

// Service import
import { AdminWorkerCleanMissingService } from "@modules/adminWorker/services/adminWorkerCleanMissing.service";

class AdminWorkerCleanMissingController {
  public async delete(req: Request, res: Response) {
    const adminWorkerCleanMissingService = container.resolve(
      AdminWorkerCleanMissingService,
    );

    await adminWorkerCleanMissingService.execute({
      user: req.user_session.user,
      language: req.language,
    });

    return res.sendStatus(200);
  }
}

export { AdminWorkerCleanMissingController };
