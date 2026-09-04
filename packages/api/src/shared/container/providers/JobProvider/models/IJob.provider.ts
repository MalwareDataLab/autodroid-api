// DTO import
import { IJobOptionsDTO } from "../types/IAddJobOptions.dto";

import * as Jobs from "../jobs";
import { JobTypes } from "../jobs/types";

type JobKey = keyof typeof Jobs;

export type JobType<T extends JobKey> = JobTypes[T];

export interface IJobProvider {
  readonly initialization: Promise<void>;

  add<T extends JobKey>(
    name: T,
    data: JobType<T>,
    options?: IJobOptionsDTO,
  ): void;

  close(): Promise<void>;
}
