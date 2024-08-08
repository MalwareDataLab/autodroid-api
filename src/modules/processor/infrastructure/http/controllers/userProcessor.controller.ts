import { container } from "tsyringe";
import { Request, Response } from "express";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserProcessorIndexService } from "@modules/processor/services/userProcessorIndex.service";
import { UserProcessorShowService } from "@modules/processor/services/userProcessorShow.service";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

class UserProcessorControllerClass {
  public async index(req: Request, res: Response) {
    const userProcessorIndexService = container.resolve(
      UserProcessorIndexService,
    );

    const processor = await userProcessorIndexService.execute({
      pagination: req.pagination,
      sorting: req.sorting as SortingFieldSchema<
        typeof ProcessorSortingOptions
      >[],
    });

    return res.json(process(processor));
  }

  public async show(req: Request, res: Response) {
    const userProcessorShowService = container.resolve(
      UserProcessorShowService,
    );
    const processor = await userProcessorShowService.execute({
      processor_id: req.params.processor_id,
      language: req.language,
    });
    return res.json(process(processor));
  }
}

const UserProcessorController = new UserProcessorControllerClass();
export { UserProcessorController };
