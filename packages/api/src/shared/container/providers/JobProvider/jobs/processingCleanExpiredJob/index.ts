import { injectable, container } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/types/IJob";

// Service import
import { ProcessingCleanExpiredService } from "@modules/processing/services/processingCleanExpired.service";

// DTO import
import {
  IJobOptionsDTO,
  IQueueOptionsDTO,
} from "../../types/IAddJobOptions.dto";

type IProcessingCleanExpiredJob = never;

@injectable()
class ProcessingCleanExpiredJob implements IJob {
  public readonly name = "ProcessingCleanExpiredJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {};
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor() {}

  public async handle(
    job: Job<IProcessingCleanExpiredJob>,
    done: DoneCallback,
  ): Promise<void> {
    try {
      const processingCleanExpiredService = container.resolve(
        ProcessingCleanExpiredService,
      );

      const count = await processingCleanExpiredService.execute();

      done(null, `Removed ${count} expired processes.`);
    } catch (error: any) {
      done(
        new AppError({
          key: "@processing_clean_expired_job/ERROR",
          message: `Fail to cleanup processes. ${error.message}`,
          debug: { error, data: job.data },
        }),
      );
    }
  }

  public async onFailed(_: Job, __: Error): Promise<void> {}
}

export type { IProcessingCleanExpiredJob };
export { ProcessingCleanExpiredJob };
