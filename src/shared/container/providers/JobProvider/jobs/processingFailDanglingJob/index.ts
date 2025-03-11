import { injectable, container } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/types/IJob";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Service import
import { ProcessingFailDanglingService } from "@modules/processing/services/processingFailDangling.service";

// DTO import
import {
  IJobOptionsDTO,
  IQueueOptionsDTO,
} from "../../types/IAddJobOptions.dto";

type IProcessingFailDanglingJob = never;

@injectable()
class ProcessingFailDanglingJob implements IJob {
  public readonly name = "ProcessingFailDanglingJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {};
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor() {}

  public async handle(
    job: Job<IProcessingFailDanglingJob>,
    done: DoneCallback,
  ): Promise<void> {
    try {
      const processingFailDanglingService = container.resolve(
        ProcessingFailDanglingService,
      );

      const count = await processingFailDanglingService.execute({
        created_at_end_date: DateUtils.now().subtract(1, "day").toDate(),
        status: PROCESSING_STATUS.PENDING,
      });

      done(null, `Failed ${count} dangling processes.`);
    } catch (error: any) {
      done(
        new AppError({
          key: "@processing_fail_dangling_job/ERROR",
          message: `Fail to fail dangling processes. ${error.message}`,
          debug: { error, data: job.data },
        }),
      );
    }
  }

  public async onFailed(_: Job, __: Error): Promise<void> {}
}

export type { IProcessingFailDanglingJob };
export { ProcessingFailDanglingJob };
