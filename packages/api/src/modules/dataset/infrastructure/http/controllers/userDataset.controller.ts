import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { withVisibleDatasetOwner } from "@modules/dataset/utils/withVisibleDatasetOwner.util";
import { process } from "@shared/utils/instanceParser";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { UserDatasetCreateService } from "@modules/dataset/services/userDatasetCreate.service";
import { UserDatasetDeleteService } from "@modules/dataset/services/userDatasetDelete.service";
import { UserDatasetIndexService } from "@modules/dataset/services/userDatasetIndex.service";
import { UserDatasetShowService } from "@modules/dataset/services/userDatasetShow.service";
import { UserDatasetUpdateService } from "@modules/dataset/services/userDatasetUpdate.service";

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

      user: req.user_session.user,
      agent_info: req.agent_info,
      language: req.language,
    });
    return res.status(201).json(process(dataset));
  }

  public async index(req: Request, res: Response) {
    const userDatasetIndexService = container.resolve(UserDatasetIndexService);
    const dataset = await userDatasetIndexService.execute({
      user: req.user_session.user,

      pagination: req.pagination,
      sorting: req.sorting as SortingFieldSchema<
        typeof DatasetSortingOptions
      >[],
    });
    return res.json(
      process({
        ...dataset,
        edges: dataset.edges.map(edge => ({
          ...edge,
          node: withVisibleDatasetOwner(edge.node, req.user_session),
        })),
      }),
    );
  }

  public async show(req: Request, res: Response) {
    const userDatasetShowService = container.resolve(UserDatasetShowService);
    const dataset = await userDatasetShowService.execute({
      dataset_id: req.params.dataset_id,

      user: req.user_session.user,
      language: req.language,
    });
    return res.json(
      process(withVisibleDatasetOwner(dataset, req.user_session)),
    );
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

      user: req.user_session.user,
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

      user: req.user_session.user,
      language: req.language,
    });
    return res.json(process(dataset));
  }
}

export { UserDatasetController };
