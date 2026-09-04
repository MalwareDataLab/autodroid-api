import { inject, injectable } from "tsyringe";

// Config import
import { getProcessingConfig } from "@config/processing";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { ProcessingTimeEstimation } from "@modules/processing/entities/processingTimeEstimation.entity";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Schema import
import { AdminProcessingGetEstimatedExecutionTimeSchema } from "../schemas/adminProcessingEstimatedExecutionTime.schema";

interface IRequest {
  user: User;

  filter: AdminProcessingGetEstimatedExecutionTimeSchema;

  language: string;
}

@injectable()
class AdminProcessingEstimatedExecutionTimeIndexService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    filter,
  }: IRequest): Promise<ProcessingTimeEstimation[]> {
    const { ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS } =
      getProcessingConfig();

    const estimations =
      await this.processingRepository.getManyEstimatedExecutionTimes(filter);

    const processes = await this.processingRepository.findMany({
      finished: false,
    });

    const estimated_waiting_times = processes.reduce<Record<string, number>>(
      (acc, process) => {
        const currentKey = `${process.dataset.id}-${process.processor.id}`;
        const currentAcc = acc[currentKey] || 0;

        const currentEstimation = estimations.find(
          estimation =>
            estimation.processor_id === process.processor.id &&
            estimation.dataset_id === process.dataset.id,
        );
        if (!currentEstimation)
          return {
            ...acc,
            [currentKey]: currentAcc,
          };

        const seconds = Math.round(
          currentEstimation.average_execution_time_seconds,
        );

        if (!process.started_at)
          return {
            ...acc,
            [currentKey]: currentAcc + seconds,
          };

        const remainingSeconds = DateUtils.parse(process.started_at)
          .add(seconds, "seconds")
          .diff(DateUtils.now(), "seconds", false);

        return {
          ...acc,
          [currentKey]: Math.round(currentAcc + Math.max(remainingSeconds, 0)),
        };
      },
      {},
    );

    return estimations.map(estimation =>
      ProcessingTimeEstimation.make({
        dataset_id: estimation.dataset_id,
        processor_id: estimation.processor_id,
        estimated_execution_time: Math.round(
          estimation.average_execution_time_seconds,
        ),
        estimated_waiting_time: estimated_waiting_times[
          `${estimation.dataset_id}-${estimation.processor_id}`
        ]
          ? estimated_waiting_times[
              `${estimation.dataset_id}-${estimation.processor_id}`
            ] + ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS
          : null,
      }),
    );
  }
}

export { AdminProcessingEstimatedExecutionTimeIndexService };
