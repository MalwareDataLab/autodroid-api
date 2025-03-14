import { injectable, container } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/types/IJob";

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
  processing_ids: string[];
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
  public readonly queueOptions: IQueueOptionsDTO = {
    guardInterval: 1000,
    retryProcessDelay: 1000,
  };

  constructor() {}

  public async handle(
    job: Job<IDispatchDatasetProcessingJob>,
    done: DoneCallback,
  ): Promise<void> {
    const { processing_ids } = job.data;
    try {
      const datasetProcessorProvider =
        container.resolve<IDatasetProcessorProvider>(
          "DatasetProcessorProvider",
        );
      const processing =
        await datasetProcessorProvider.dispatchNotStartedProcesses({
          processing_ids,
        });

      done(
        null,
        `Dispatched ${processing.dispatched.length} processes, ${processing.failed.length} failed, and ${processing.skipped.length} skipped.`,
      );
    } catch (error: any) {
      done(
        new AppError({
          key: "@dispatch_dataset_processing_job/ERROR",
          message: `Unable to dispatch processes originated from ${processing_ids[0]}${processing_ids.length > 1 ? ` and ${processing_ids.length - 1}` : ""}. ${error.message}`,
        }),
      );
    }
  }

  public async onFailed(job: Job, err: Error): Promise<void> {
    const { processing_ids } = job.data;

    if (job.attemptsMade >= this.jobOptions.attempts) {
      const processingHandleFailureService = container.resolve(
        ProcessingHandleFailureService,
      );

      await processingHandleFailureService.execute({
        processing_ids,
        message: `Fail to dispatch processing ${job.data.processing_id} after ${job.attemptsMade} attempts. ${err.message}`,
      });
    }
  }
}

export type { IDispatchDatasetProcessingJob };
export { DispatchDatasetProcessingJob };
