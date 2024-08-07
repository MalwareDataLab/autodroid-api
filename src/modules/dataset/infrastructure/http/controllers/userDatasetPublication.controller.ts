import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserDatasetRequestPublicationService } from "@modules/dataset/services/userDatasetRequestPublication.service";

class UserDatasetPublicationControllerClass {
  public async update(req: Request, res: Response) {
    const userDatasetRequestPublicationService = container.resolve(
      UserDatasetRequestPublicationService,
    );
    const dataset = await userDatasetRequestPublicationService.execute({
      dataset_id: req.params.dataset_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }
}

const UserDatasetPublicationController =
  new UserDatasetPublicationControllerClass();
export { UserDatasetPublicationController };
