import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { withVisibleProcessingOwners } from "@modules/processing/utils/withVisibleProcessingOwners.util";
import { parse, process } from "@shared/utils/instanceParser";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Schema import
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { UserProcessingDeleteService } from "@modules/processing/services/userProcessingDelete.service";
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";
import { UserProcessingShowService } from "@modules/processing/services/userProcessingShow.service";
import { UserRequestDatasetProcessingService } from "@modules/processing/services/userRequestDatasetProcessing.service";

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

    return res.json(
      process(withVisibleProcessingOwners(processing, req.user_session)),
    );
  }

  public async index(req: Request, res: Response) {
    const userProcessingIndexService = container.resolve(
      UserProcessingIndexService,
    );

    const processing = await userProcessingIndexService.execute({
      user: req.user_session.user,

      params: parse(ProcessingIndexSchema, req.query),

      pagination: req.pagination,
      sorting: req.sorting as SortingFieldSchema<
        typeof ProcessingSortingOptions
      >[],

      language: req.language,
    });

    return res.json(
      process({
        ...processing,
        edges: processing.edges.map(edge => ({
          ...edge,
          node: withVisibleProcessingOwners(edge.node, req.user_session),
        })),
      }),
    );
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
    return res.json(
      process(withVisibleProcessingOwners(processing, req.user_session)),
    );
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
    return res.json(
      process(withVisibleProcessingOwners(processing, req.user_session)),
    );
  }
}

export { UserProcessingController };
