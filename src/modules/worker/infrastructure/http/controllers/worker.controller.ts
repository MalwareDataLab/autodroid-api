import { Request, Response } from "express";

// Util import
import { process } from "@shared/utils/instanceParser";

class WorkerController {
  public async get(req: Request, res: Response) {
    return res.json(process(req.worker_session.worker));
  }
}

export { WorkerController };
