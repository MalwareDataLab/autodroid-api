import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { parse, process } from "@shared/utils/instanceParser";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Schema import
import { AdminProcessingIndexSchema } from "@modules/adminProcessing/schemas/adminProcessing.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { AdminProcessingDeleteService } from "@modules/adminProcessing/services/adminProcessingDelete.service";
import { AdminProcessingIndexService } from "@modules/adminProcessing/services/adminProcessingIndex.service";
import { AdminProcessingShowService } from "@modules/adminProcessing/services/adminProcessingShow.service";
import { AdminProcessingUpdateService } from "@modules/adminProcessing/services/adminProcessingUpdate.service";

class AdminProcessingController {
  public async index(req: Request, res: Response) {
    const adminProcessingIndexService = container.resolve(
      AdminProcessingIndexService,
    );
    const processing = await adminProcessingIndexService.execute({
      filter: parse(AdminProcessingIndexSchema, req.query),
      pagination: req.pagination,
      sorting: req.sorting as SortingFieldSchema<
        typeof ProcessingSortingOptions
      >[],
      user: req.user_session.user,
    });
    return res.json(process(processing));
  }

  public async show(req: Request, res: Response) {
    const adminProcessingShowService = container.resolve(
      AdminProcessingShowService,
    );
    const processing = await adminProcessingShowService.execute({
      processing_id: req.params.processing_id,

      user: req.user_session.user,
      language: req.language,
    });
    return res.json(process(processing));
  }

  public async update(req: Request, res: Response) {
    const adminProcessingUpdateService = container.resolve(
      AdminProcessingUpdateService,
    );
    const processing = await adminProcessingUpdateService.execute({
      processing_id: req.params.processing_id,
      data: req.body,

      user: req.user_session.user,
      language: req.language,
    });
    return res.json(process(processing));
  }

  public async delete(req: Request, res: Response) {
    const adminProcessingDeleteService = container.resolve(
      AdminProcessingDeleteService,
    );
    const processing = await adminProcessingDeleteService.execute({
      processing_id: req.params.processing_id,

      user: req.user_session.user,
      language: req.language,
    });
    return res.json(process(processing));
  }
}

export { AdminProcessingController };
