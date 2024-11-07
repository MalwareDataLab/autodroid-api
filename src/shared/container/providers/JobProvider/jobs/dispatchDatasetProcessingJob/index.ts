import { injectable, inject } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/models/IJob";

// Provider import
import { IDatasetProcessorProvider } from "@shared/container/providers/DatasetProcessorProvider/models/IDatasetProcessor.provider";

// DTO import
import {
  IJobOptionsDTO,
  IQueueOptionsDTO,
} from "../../types/IAddJobOptions.dto";

type IDispatchDatasetProcessingJob = {
  processing_id: string;
};

@injectable()
class DispatchDatasetProcessingJob implements IJob {
  public readonly name = "DispatchDatasetProcessingJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {};
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor(
    @inject("DatasetProcessorProvider")
    private datasetProcessorProvider: IDatasetProcessorProvider,
  ) {}

  public async handle(
    job: Job<IDispatchDatasetProcessingJob>,
    done: DoneCallback,
  ): Promise<void> {
    const { processing_id } = job.data;
    try {
      const processing = await this.datasetProcessorProvider.dispatchProcess({
        processing_id,
      });

      done(
        null,
        `Processing ${processing.id} dispatched successfully to worker ${processing.worker_id}.`,
      );
    } catch (error: any) {
      done(
        new AppError({
          key: "@dispatch_dataset_processing_job/ERROR",
          message: `Fail to dispatch processing ${processing_id}. ${error.message}`,
        }),
      );
    }
  }
}

export type { IDispatchDatasetProcessingJob };
export { DispatchDatasetProcessingJob };
