import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserUpdateLearningDataService } from "@modules/user/services/userUpdateLearningData.service";

class UserLearningDataController {
  public async update(req: Request, res: Response) {
    const userUpdateLearningDataService = container.resolve(
      UserUpdateLearningDataService,
    );

    const user = await userUpdateLearningDataService.execute({
      user: req.session.user,
      params: req.body,
      language: req.language,
    });

    return res.json(process(user));
  }
}

export { UserLearningDataController };
