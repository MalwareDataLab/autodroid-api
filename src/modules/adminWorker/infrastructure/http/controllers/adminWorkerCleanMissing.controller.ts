import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminWorkerCleanMissingService } from "@modules/adminWorker/services/adminWorkerCleanMissing.service";

class AdminWorkerCleanMissingController {
  public async delete(req: Request, res: Response) {
    const adminWorkerCleanMissingService = container.resolve(
      AdminWorkerCleanMissingService,
    );
    const worker = await adminWorkerCleanMissingService.execute({
      user: req.session.user,
      language: req.language,
    });
    return res.json(process(worker));
  }
}

export { AdminWorkerCleanMissingController };
