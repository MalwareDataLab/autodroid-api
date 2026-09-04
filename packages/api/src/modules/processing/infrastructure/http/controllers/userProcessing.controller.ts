import { container } from "tsyringe";
import { Request, Response } from "express";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserRequestDatasetProcessingService } from "@modules/processing/services/userRequestDatasetProcessing.service";
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";
import { UserProcessingShowService } from "@modules/processing/services/userProcessingShow.service";
import { UserProcessingDeleteService } from "@modules/processing/services/userProcessingDelete.service";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

class UserProcessingController {
  public async create(req: Request, res: Response) {
    const userRequestDatasetProcessingService = container.resolve(
      UserRequestDatasetProcessingService,
    );

    const processing = await userRequestDatasetProcessingService.execute({
      params: req.body,

      user: req.user_session.user,
      language: req.language,
    });

    return res.json(process(processing));
  }

  public async index(req: Request, res: Response) {
    const userProcessingIndexService = container.resolve(
      UserProcessingIndexService,
    );

    const processing = await userProcessingIndexService.execute({
      user: req.user_session.user,

      params: req.query,

      pagination: req.pagination,
      sorting: req.sorting as SortingFieldSchema<
        typeof ProcessingSortingOptions
      >[],

      language: req.language,
    });

    return res.json(process(processing));
  }

  public async show(req: Request, res: Response) {
    const userProcessingShowService = container.resolve(
      UserProcessingShowService,
    );
    const processing = await userProcessingShowService.execute({
      user: req.user_session.user,

      processing_id: req.params.processing_id,

      language: req.language,
    });
    return res.json(process(processing));
  }

  public async delete(req: Request, res: Response) {
    const userProcessingDeleteService = container.resolve(
      UserProcessingDeleteService,
    );
    const processing = await userProcessingDeleteService.execute({
      user: req.user_session.user,

      processing_id: req.params.processing_id,

      language: req.language,
    });
    return res.json(process(processing));
  }
}

export { UserProcessingController };
