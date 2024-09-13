import { container } from "tsyringe";
import { Request, Response } from "express";

// Constant import
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminWorkerIndexService } from "@modules/adminWorker/services/adminWorkerIndex.service";
import { AdminWorkerShowService } from "@modules/adminWorker/services/adminWorkerShow.service";
import { AdminWorkerDeleteService } from "@modules/adminWorker/services/adminWorkerDelete.service";

// Schema import
import { WorkerIndexSchema } from "@modules/worker/schemas/worker.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

class AdminWorkerController {
  public async index(req: Request, res: Response) {
    const userWorkerIndexService = container.resolve(AdminWorkerIndexService);
    const worker = await userWorkerIndexService.execute({
      filter: WorkerIndexSchema.make({
        archived: req.query.archived,
        user_id: req.query.user_id,
        registration_token_id: req.query.registration_token_id,
      } as WorkerIndexSchema),

      sorting: req.sorting as SortingFieldSchema<typeof WorkerSortingOptions>[],
      pagination: req.pagination,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(worker));
  }

  public async show(req: Request, res: Response) {
    const userWorkerShowService = container.resolve(AdminWorkerShowService);
    const worker = await userWorkerShowService.execute({
      worker_id: req.params.worker_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(worker));
  }

  public async delete(req: Request, res: Response) {
    const userWorkerDeleteService = container.resolve(AdminWorkerDeleteService);
    const worker = await userWorkerDeleteService.execute({
      worker_id: req.params.worker_id,

      user: req.session.user,
      language: req.language,
    });
    return res.json(process(worker));
  }
}

export { AdminWorkerController };
