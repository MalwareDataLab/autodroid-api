// DTO import
import { IJobOptionsDTO } from "../types/IAddJobOptions.dto";

import type { ITestJob } from "../jobs/testJob";

import * as Jobs from "../jobs";

type JobKey = keyof typeof Jobs;

type JobTypeMap = {
  TestJob: ITestJob;
};

export type JobType<T extends JobKey> = JobTypeMap[T];

export interface IJobProvider {
  readonly initialization: Promise<void>;

  add<T extends JobKey>(
    name: T,
    data: JobType<T>,
    options?: IJobOptionsDTO,
  ): void;

  close(): Promise<void>;
}
