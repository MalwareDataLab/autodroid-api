import { Job, DoneCallback } from "bull";

// DTO import
import { IJobOptionsDTO, IQueueOptionsDTO } from "../types/IAddJobOptions.dto";

interface IJob {
  name: string;
  concurrency: number;

  jobOptions: IJobOptionsDTO;
  queueOptions: IQueueOptionsDTO;

  handle(job: Job, done: DoneCallback): Promise<void>;
}

export type { IJob };
