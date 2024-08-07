import { container } from "tsyringe";
import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { ProcessorIndexService } from "@modules/processor/services/processorIndex.service";
import { ProcessorShowService } from "@modules/processor/services/processorShow.service";

class ProcessorControllerClass {
  public async index(req: Request, res: Response) {
    const processorIndexService = container.resolve(ProcessorIndexService);
    const processor = await processorIndexService.execute();
    return res.json(process(processor));
  }

  public async show(req: Request, res: Response) {
    const processorShowService = container.resolve(ProcessorShowService);
    const processor = await processorShowService.execute({
      code: req.params.processor_code,

      language: req.language,
    });
    return res.json(process(processor));
  }
}

const ProcessorController = new ProcessorControllerClass();
export { ProcessorController };
