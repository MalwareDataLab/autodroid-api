import { container } from "tsyringe";
import { Request, Response } from "express";

// Service import
import { AdminFileRemoveAllDanglingService } from "@modules/adminFile/services/adminFileRemoveAllDangling.service";

class AdminRemoveAllDanglingFilesController {
  public async delete(req: Request, res: Response) {
    const adminRemoveAllDanglingFilesService = container.resolve(
      AdminFileRemoveAllDanglingService,
    );

    await adminRemoveAllDanglingFilesService.execute({
      user: req.user_session.user,
      language: req.language,
    });

    return res.sendStatus(200);
  }
}

export { AdminRemoveAllDanglingFilesController };
