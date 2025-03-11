import { injectable, container } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/types/IJob";

// Service import
import { WorkerCleanMissingService } from "@modules/worker/services/workerCleanMissing.service";

// DTO import
import {
  IJobOptionsDTO,
  IQueueOptionsDTO,
} from "../../types/IAddJobOptions.dto";

type IWorkerCleanMissingJob = never;

@injectable()
class WorkerCleanMissingJob implements IJob {
  public readonly name = "WorkerCleanMissingJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {};
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor() {}

  public async handle(
    job: Job<IWorkerCleanMissingJob>,
    done: DoneCallback,
  ): Promise<void> {
    try {
      const workerCleanMissingService = container.resolve(
        WorkerCleanMissingService,
      );

      const count = await workerCleanMissingService.execute();

      done(null, `Removed ${count} missing workers.`);
    } catch (error: any) {
      done(
        new AppError({
          key: "@worker_clean_missing_job/ERROR",
          message: `Fail to cleanup workers. ${error.message}`,
          debug: { error, data: job.data },
        }),
      );
    }
  }

  public async onFailed(_: Job, __: Error): Promise<void> {}
}

export type { IWorkerCleanMissingJob };
export { WorkerCleanMissingJob };
