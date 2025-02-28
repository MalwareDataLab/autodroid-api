import { inject, injectable } from "tsyringe";

// Config import
import { getProcessingConfig } from "@config/processing";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { DateUtils } from "@shared/utils/dateUtils";
import { ProcessingTimeEstimation } from "../entities/processingTimeEstimation.entity";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

interface IRequest {
  user: User;

  dataset_id: string;
  processor_id: string;

  language: string;
}

@injectable()
class UserProcessingGetEstimatedExecutionTimeService {
  private processingGuard: ProcessingGuard;

  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {
    this.processingGuard = new ProcessingGuard(
      this.processingRepository,
      this.datasetRepository,
      this.processorRepository,
    );
  }

  public async execute(params: IRequest): Promise<ProcessingTimeEstimation> {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();

    const { dataset, processor } = await this.processingGuard.execute(params);

    const estimations =
      await this.processingRepository.getManyEstimatedExecutionTimes();

    const selectedEstimation = estimations.find(
      estimation =>
        estimation.processor_id === processor.id &&
        estimation.dataset_id === dataset.id,
    );

    if (!selectedEstimation)
      return ProcessingTimeEstimation.make({
        dataset_id: dataset.id,
        processor_id: processor.id,
        estimated_execution_time: null,
        estimated_waiting_time: null,
      });

    const processes = await this.processingRepository.findMany({
      finished: false,
    });

    const estimated_waiting_time = processes.reduce((acc, process) => {
      const currentEstimation = estimations.find(
        estimation =>
          estimation.processor_id === processor.id &&
          estimation.dataset_id === dataset.id,
      );
      if (!currentEstimation) return acc;

      const seconds = Math.round(
        currentEstimation.average_execution_time_seconds,
      );

      if (!process.started_at) return acc + seconds;

      const remainingSeconds = DateUtils.parse(process.started_at)
        .add(seconds, "seconds")
        .diff(DateUtils.now(), "seconds", false);

      return acc + Math.max(remainingSeconds, 0);
    }, ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS);

    return ProcessingTimeEstimation.make({
      dataset_id: dataset.id,
      processor_id: processor.id,
      estimated_execution_time: Math.round(
        selectedEstimation.average_execution_time_seconds,
      ),
      estimated_waiting_time,
    });
  }
}

export { UserProcessingGetEstimatedExecutionTimeService };
