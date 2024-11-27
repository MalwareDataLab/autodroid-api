import { injectable, container } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/models/IJob";

// Provider import
import { IDatasetProcessorProvider } from "@shared/container/providers/DatasetProcessorProvider/models/IDatasetProcessor.provider";

// Service import
import { ProcessingHandleFailureService } from "@modules/processing/services/processingHandleFailure.service";

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

  public readonly jobOptions = {
    attempts: 1440,
    backoff: {
      type: "fixed",
      delay: 60 * 1000,
    },
  } satisfies IJobOptionsDTO;
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor() {}

  public async handle(
    job: Job<IDispatchDatasetProcessingJob>,
    done: DoneCallback,
  ): Promise<void> {
    const { processing_id } = job.data;
    try {
      const datasetProcessorProvider =
        container.resolve<IDatasetProcessorProvider>(
          "DatasetProcessorProvider",
        );
      const processing = await datasetProcessorProvider.dispatchProcess({
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

  public async onFailed(job: Job, err: Error): Promise<void> {
    if (job.attemptsMade >= this.jobOptions.attempts) {
      const processingHandleFailureService = container.resolve(
        ProcessingHandleFailureService,
      );

      await processingHandleFailureService.execute({
        processing_id: job.data.processing_id,
        message: `Fail to dispatch processing ${job.data.processing_id} after ${job.attemptsMade} attempts. ${err.message}`,
      });
    }
  }
}

export type { IDispatchDatasetProcessingJob };
export { DispatchDatasetProcessingJob };
