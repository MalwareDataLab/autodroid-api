import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserUpdateDataService } from "@modules/user/services/userUpdateData.service";

class UserControllerClass {
  public async get(req: Request, res: Response) {
    return res.json(process(req.session?.user));
  }

  public async update(req: Request, res: Response) {
    const userUpdateDataService = container.resolve(UserUpdateDataService);

    const user = await userUpdateDataService.execute({
      user: req.session.user,
      data: req.body,
      language: req.language,
    });

    return res.json(process(user));
  }
}

const UserController = new UserControllerClass();
export { UserController };
