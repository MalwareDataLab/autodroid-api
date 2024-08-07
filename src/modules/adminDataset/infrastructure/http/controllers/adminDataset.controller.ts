import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminDatasetIndexService } from "@modules/adminDataset/services/adminDatasetIndex.service";
import { AdminDatasetShowService } from "@modules/adminDataset/services/adminDatasetShow.service";
import { AdminDatasetUpdateService } from "@modules/adminDataset/services/adminDatasetUpdate.service";
import { AdminDatasetDeleteService } from "@modules/adminDataset/services/adminDatasetDelete.service";

class AdminDatasetControllerClass {
  public async index(req: Request, res: Response) {
    const adminDatasetIndexService = container.resolve(
      AdminDatasetIndexService,
    );
    const dataset = await adminDatasetIndexService.execute({
      filter: req.query,
      user: req.session.user,
    });
    return res.json(process(dataset));
  }

  public async show(req: Request, res: Response) {
    const adminDatasetShowService = container.resolve(AdminDatasetShowService);
    const dataset = await adminDatasetShowService.execute({
      dataset_id: req.params.dataset_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }

  public async update(req: Request, res: Response) {
    const adminDatasetUpdateService = container.resolve(
      AdminDatasetUpdateService,
    );
    const dataset = await adminDatasetUpdateService.execute({
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
    const adminDatasetDeleteService = container.resolve(
      AdminDatasetDeleteService,
    );
    const dataset = await adminDatasetDeleteService.execute({
      dataset_id: req.params.dataset_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }
}

const AdminDatasetController = new AdminDatasetControllerClass();
export { AdminDatasetController };
