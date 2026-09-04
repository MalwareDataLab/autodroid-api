import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerGenerateAccessTokenService } from "@modules/worker/services/workerGenerateAccessToken.service";

class WorkerGenerateAccessTokenController {
  public async update(req: Request, res: Response) {
    const workerGenerateAccessTokenService = container.resolve(
      WorkerGenerateAccessTokenService,
    );

    const workerAccessToken = await workerGenerateAccessTokenService.execute({
      data: req.body,
      agent_info: req.agent_info,
    });

    return res.json(process(workerAccessToken));
  }
}

export { WorkerGenerateAccessTokenController };
