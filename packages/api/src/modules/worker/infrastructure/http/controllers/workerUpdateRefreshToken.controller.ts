import { Request, Response } from "express";
import { container } from "tsyringe";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { WorkerUpdateRefreshTokenService } from "@modules/worker/services/workerUpdateRefreshToken.service";

class WorkerUpdateRefreshTokenController {
  public async update(req: Request, res: Response) {
    const workerUpdateRefreshTokenService = container.resolve(
      WorkerUpdateRefreshTokenService,
    );

    const worker = await workerUpdateRefreshTokenService.execute({
      data: req.body,
      agent_info: req.agent_info,
    });

    return res.json(process(worker));
  }
}

export { WorkerUpdateRefreshTokenController };
