import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// DTO import
import { UserSessionsCloseService } from "@modules/user/services/userSessionsClose.service";

class UserSessionControllerClass {
  public async get(req: Request, res: Response) {
    return res.json(process(req.session));
  }

  public async delete(req: Request, res: Response) {
    const userSessionsCloseService = container.resolve(
      UserSessionsCloseService,
    );

    await userSessionsCloseService.execute({
      user: req.session.user,
      language: req.language,
    });

    return res.json(process(req.session.user_auth_provider_conn));
  }
}

const UserSessionController = new UserSessionControllerClass();
export { UserSessionController };
