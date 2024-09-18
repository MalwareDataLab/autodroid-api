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

type ITestJob = any;

@injectable()
class TestJob implements IJob {
  public readonly name = "TestJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {};
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor() {}

  public async handle(job: Job<ITestJob>, done: DoneCallback): Promise<void> {
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

export type { ITestJob };
export { TestJob };
