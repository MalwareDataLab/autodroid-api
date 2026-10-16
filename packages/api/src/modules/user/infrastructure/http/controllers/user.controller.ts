import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserUpdateDataService } from "@modules/user/services/userUpdateData.service";

class UserController {
  public async show(req: Request, res: Response) {
    return res.json(process(req.user_session?.user));
  }

  public async update(req: Request, res: Response) {
    const userUpdateDataService = container.resolve(UserUpdateDataService);

    const user = await userUpdateDataService.execute({
      user: req.user_session.user,
      data: req.body,
      language: req.language,
    });

    return res.json(process(user));
  }
}

export { UserController };
