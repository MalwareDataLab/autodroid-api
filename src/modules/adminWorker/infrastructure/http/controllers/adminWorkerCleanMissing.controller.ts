import { container } from "tsyringe";
import { Request, Response } from "express";

// Service import
import { AdminWorkerCleanMissingService } from "@modules/adminWorker/services/adminWorkerCleanMissing.service";

class AdminWorkerCleanMissingController {
  public async delete(req: Request, res: Response) {
    const adminWorkerCleanMissingService = container.resolve(
      AdminWorkerCleanMissingService,
    );

    await adminWorkerCleanMissingService.execute({
      user: req.session.user,
      language: req.language,
    });

    return res.sendStatus(200);
  }
}

export { AdminWorkerCleanMissingController };
