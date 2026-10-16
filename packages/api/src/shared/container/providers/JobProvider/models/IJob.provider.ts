// Type import
import { JobTypes } from "../jobs/types";

// DTO import
import { IJobOptionsDTO } from "../types/IAddJobOptions.dto";

// Job import
import * as Jobs from "../jobs";

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
