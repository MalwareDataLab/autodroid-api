import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerRegisterService } from "@modules/worker/services/workerRegister.service";

class WorkerRegisterController {
  public async create(req: Request, res: Response) {
    const workerRegisterService = container.resolve(WorkerRegisterService);

    const worker = await workerRegisterService.execute({
      data: req.body,
      agent_info: req.agent_info,
    });

    return res.json(process(worker));
  }
}

export { WorkerRegisterController };
