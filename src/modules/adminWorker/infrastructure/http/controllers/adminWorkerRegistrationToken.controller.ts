import { container } from "tsyringe";
import { Request, Response } from "express";

// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminWorkerRegistrationTokenCreateService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenCreate.service";
import { AdminWorkerRegistrationTokenIndexService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenIndex.service";
import { AdminWorkerRegistrationTokenShowService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenShow.service";
import { AdminWorkerRegistrationTokenDeleteService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenDelete.service";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { WorkerRegistrationTokenIndexSchema } from "@modules/worker/schemas/workerRegistrationToken.schema";

class AdminWorkerRegistrationTokenController {
  public async create(req: Request, res: Response) {
    const userWorkerRegistrationTokenCreateService = container.resolve(
      AdminWorkerRegistrationTokenCreateService,
    );
    const workerRegistrationToken =
      await userWorkerRegistrationTokenCreateService.execute({
        data: {
          is_unlimited_usage: req.body.is_unlimited_usage,
          expires_at: req.body.expires_at,
        },

        user: req.user_session.user,
        language: req.language,
      });
    return res.status(201).json(process(workerRegistrationToken));
  }

  public async index(req: Request, res: Response) {
    const userWorkerRegistrationTokenIndexService = container.resolve(
      AdminWorkerRegistrationTokenIndexService,
    );
    const workerRegistrationToken =
      await userWorkerRegistrationTokenIndexService.execute({
        filter: WorkerRegistrationTokenIndexSchema.make({
          activatable: req.query.activatable,
          activated: req.query.activated,
          is_unlimited_usage: req.query.is_unlimited_usage,
          expires_at: req.query.expires_at,
          created_at: req.query.created_at,
          updated_at: req.query.updated_at,
          archived: req.query.archived,
          expired: req.query.expired,
          token: req.query.token,
          user_id: req.query.user_id,
        } as WorkerRegistrationTokenIndexSchema),

        sorting: req.sorting as SortingFieldSchema<
          typeof WorkerRegistrationTokenSortingOptions
        >[],
        pagination: req.pagination,

        user: req.user_session.user,
        language: req.language,
      });
    return res.json(process(workerRegistrationToken));
  }

  public async show(req: Request, res: Response) {
    const userWorkerRegistrationTokenShowService = container.resolve(
      AdminWorkerRegistrationTokenShowService,
    );
    const workerRegistrationToken =
      await userWorkerRegistrationTokenShowService.execute({
        worker_registration_token_id: req.params.worker_registration_token_id,

        user: req.user_session.user,
        language: req.language,
      });
    return res.json(process(workerRegistrationToken));
  }

  public async delete(req: Request, res: Response) {
    const userWorkerRegistrationTokenDeleteService = container.resolve(
      AdminWorkerRegistrationTokenDeleteService,
    );
    const workerRegistrationToken =
      await userWorkerRegistrationTokenDeleteService.execute({
        worker_registration_token_id: req.params.worker_registration_token_id,

        user: req.user_session.user,
        language: req.language,
      });
    return res.json(process(workerRegistrationToken));
  }
}

export { AdminWorkerRegistrationTokenController };
