import { inject, injectable } from "tsyringe";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { DateUtils } from "@shared/utils/dateUtils";
import { ProcessingFinishTimeEstimation } from "../entities/processingFinishTimeEstimation.entity";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

interface IRequest {
  user: User;

  processing_id: string;

  language: string;
}

@injectable()
class UserProcessingGetEstimatedFinishDateService {
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

  public async execute(
    params: IRequest,
  ): Promise<ProcessingFinishTimeEstimation> {
    const { dataset, processor, processing } =
      await this.processingGuard.execute(params);

    if (processing.started_at && processing.finished_at)
      return ProcessingFinishTimeEstimation.make({
        dataset_id: dataset.id,
        processor_id: processor.id,
        processing_id: processing.id,
        estimated_start_time: processing.started_at,
        estimated_finish_time: processing.finished_at,
      });

    const estimations =
      await this.processingRepository.getManyEstimatedExecutionTimes();

    const selectedEstimation = estimations.find(
      estimation =>
        estimation.processor_id === processor.id &&
        estimation.dataset_id === dataset.id,
    );

    if (!selectedEstimation)
      return ProcessingFinishTimeEstimation.make({
        dataset_id: dataset.id,
        processor_id: processor.id,
        processing_id: processing.id,
        estimated_start_time: null,
        estimated_finish_time: null,
      });

    const processes = await this.processingRepository.findMany({
      finished: false,
    });

    const estimated_waiting_time = processing.started_at
      ? processes.reduce((acc, process) => {
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
        }, 0)
      : 0;

    return ProcessingFinishTimeEstimation.make({
      dataset_id: dataset.id,
      processor_id: processor.id,
      processing_id: processing.id,

      estimated_start_time:
        processing.started_at ||
        DateUtils.now().add(estimated_waiting_time, "seconds").toDate(),

      estimated_finish_time: processing.started_at
        ? DateUtils.parse(processing.started_at)
            .add(estimated_waiting_time, "seconds")
            .add(
              Math.round(selectedEstimation.average_execution_time_seconds),
              "seconds",
            )
            .toDate()
        : DateUtils.now()
            .add(estimated_waiting_time, "seconds")
            .add(
              Math.round(selectedEstimation.average_execution_time_seconds),
              "seconds",
            )
            .toDate(),
    });
  }
}

export { UserProcessingGetEstimatedFinishDateService };
