import { injectable } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/models/IJob";

// Provider import
import { sleep } from "@shared/utils/sleep";
import {
  IJobOptionsDTO,
  IQueueOptionsDTO,
} from "../../types/IAddJobOptions.dto";

type IDispatchDatasetProcessingJob = any;

@injectable()
class DispatchDatasetProcessingJob implements IJob {
  public readonly name = "DispatchDatasetProcessingJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {};
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor() {}

  public async handle(
    job: Job<IDispatchDatasetProcessingJob>,
    done: DoneCallback,
  ): Promise<void> {
    try {
      console.log(`inside job id ${job.id} DATA: ${JSON.stringify(job.data)}`);
      await sleep(5000);
      if (Math.random() < 0.7) throw new Error("Random failure");

      done(null, `Test job success.`);
    } catch (error: any) {
      done(
        new AppError({
          key: "@test_job/ERROR",
          message: `Test job error. ${error.message}`,
        }),
      );
    }
  }
}

export type { IDispatchDatasetProcessingJob };
export { DispatchDatasetProcessingJob };
