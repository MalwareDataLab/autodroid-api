import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserDatasetCreateService } from "@modules/dataset/services/userDatasetCreate.service";
import { UserDatasetIndexService } from "@modules/dataset/services/userDatasetIndex.service";
import { UserDatasetShowService } from "@modules/dataset/services/userDatasetShow.service";
import { UserDatasetUpdateService } from "@modules/dataset/services/userDatasetUpdate.service";
import { UserDatasetDeleteService } from "@modules/dataset/services/userDatasetDelete.service";

class UserDatasetController {
  public async create(req: Request, res: Response) {
    const userDatasetCreateService = container.resolve(
      UserDatasetCreateService,
    );
    const dataset = await userDatasetCreateService.execute({
      data: {
        filename: req.body.filename,
        md5_hash: req.body.md5_hash,
        mime_type: req.body.mime_type,
        size: req.body.size,

        description: req.body.description,
        tags: req.body.tags,
      },

      user: req.session.user,
      agent_info: req.agent_info,
      language: req.language,
    });
    return res.status(201).json(process(dataset));
  }

  public async index(req: Request, res: Response) {
    const userDatasetIndexService = container.resolve(UserDatasetIndexService);
    const dataset = await userDatasetIndexService.execute({
      user: req.session.user,
    });
    return res.json(process(dataset));
  }

  public async show(req: Request, res: Response) {
    const userDatasetShowService = container.resolve(UserDatasetShowService);
    const dataset = await userDatasetShowService.execute({
      dataset_id: req.params.dataset_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }

  public async update(req: Request, res: Response) {
    const userDatasetUpdateService = container.resolve(
      UserDatasetUpdateService,
    );
    const dataset = await userDatasetUpdateService.execute({
      dataset_id: req.params.dataset_id,
      data: {
        description: req.body.description,
        tags: req.body.tags,
      },

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }

  public async delete(req: Request, res: Response) {
    const userDatasetDeleteService = container.resolve(
      UserDatasetDeleteService,
    );
    const dataset = await userDatasetDeleteService.execute({
      dataset_id: req.params.dataset_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }
}

export { UserDatasetController };
