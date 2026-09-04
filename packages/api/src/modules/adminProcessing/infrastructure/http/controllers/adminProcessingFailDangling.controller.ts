import { container } from "tsyringe";
import { Request, Response } from "express";

// Service import
import { AdminProcessingFailDanglingService } from "@modules/adminProcessing/services/adminProcessingFailDangling.service";

class AdminProcessingFailDanglingController {
  public async update(req: Request, res: Response) {
    const adminProcessingFailDanglingService = container.resolve(
      AdminProcessingFailDanglingService,
    );

    await adminProcessingFailDanglingService.execute({
      user: req.user_session.user,
      params: req.body,
      language: req.language,
    });

    return res.sendStatus(200);
  }
}

export { AdminProcessingFailDanglingController };
