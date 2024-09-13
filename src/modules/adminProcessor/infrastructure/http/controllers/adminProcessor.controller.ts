import { container } from "tsyringe";
import { Request, Response } from "express";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Util import
import { process } from "@shared/utils/instanceParser";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { AdminProcessorIndexService } from "@modules/adminProcessor/services/adminProcessorIndex.service";
import { AdminProcessorShowService } from "@modules/adminProcessor/services/adminProcessorShow.service";
import { AdminProcessorCreateService } from "@modules/adminProcessor/services/adminProcessorCreate.service";
import { AdminProcessorUpdateService } from "@modules/adminProcessor/services/adminProcessorUpdate.service";
import { AdminProcessorDeleteService } from "@modules/adminProcessor/services/adminProcessorDelete.service";

class AdminProcessorController {
  public async index(req: Request, res: Response) {
    const adminProcessorIndexService = container.resolve(
      AdminProcessorIndexService,
    );

    const processor = await adminProcessorIndexService.execute({
      pagination: req.pagination,
      sorting: req.sorting as SortingFieldSchema<
        typeof ProcessorSortingOptions
      >[],

      user: req.session.user,
      language: req.language,
    });

    return res.json(process(processor));
  }

  public async show(req: Request, res: Response) {
    const adminProcessorShowService = container.resolve(
      AdminProcessorShowService,
    );
    const processor = await adminProcessorShowService.execute({
      processor_id: req.params.processor_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processor));
  }

  public async create(req: Request, res: Response) {
    const adminProcessorCreateService = container.resolve(
      AdminProcessorCreateService,
    );
    const processor = await adminProcessorCreateService.execute({
      data: req.body,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processor));
  }

  public async update(req: Request, res: Response) {
    const adminProcessorUpdateService = container.resolve(
      AdminProcessorUpdateService,
    );
    const processor = await adminProcessorUpdateService.execute({
      processor_id: req.params.processor_id,
      data: req.body,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processor));
  }

  public async delete(req: Request, res: Response) {
    const adminProcessorDeleteService = container.resolve(
      AdminProcessorDeleteService,
    );
    const processor = await adminProcessorDeleteService.execute({
      processor_id: req.params.processor_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(processor));
  }
}

export { AdminProcessorController };
