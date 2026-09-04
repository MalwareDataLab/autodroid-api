import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Util import
import { logger } from "@shared/utils/logger";
import { DateUtils } from "@shared/utils/dateUtils";

// Service import
import { ProcessingReportStatusService } from "@modules/processing/services/processingReportStatus.service";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

interface IRequest {
  created_at_end_date?: Date;
  status?: PROCESSING_STATUS;
}

@injectable()
class ProcessingFailDanglingService {
  private processingReportStatusService: ProcessingReportStatusService;

  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("JobProvider")
    private jobProvider: IJobProvider,
  ) {
    this.processingReportStatusService = new ProcessingReportStatusService(
      this.processingRepository,
      this.jobProvider,
    );
  }

  public async execute({
    created_at_end_date,
    status,
  }: IRequest): Promise<number> {
    if (
      !!created_at_end_date &&
      DateUtils.parse(created_at_end_date).isAfter(DateUtils.now())
    )
      throw new AppError({
        key: "@processing_fail_dangling_service/ERROR",
        message: "The created_at_end_date must be in the past",
      });

    if (
      !!status &&
      ![PROCESSING_STATUS.PENDING, PROCESSING_STATUS.RUNNING].includes(status)
    )
      throw new AppError({
        key: "@processing_fail_dangling_service/ERROR",
        message: "The status must be PENDING or RUNNING",
      });

    const expiredProcesses = await this.processingRepository.findMany({
      created_at_end_date:
        created_at_end_date || DateUtils.now().subtract(1, "day").toDate(),
      status: status || PROCESSING_STATUS.PENDING,
    });

    let count = 0;
    await Promise.all(
      expiredProcesses.map(async processing => {
        try {
          await this.processingRepository.updateOne(
            { id: processing.id },
            {
              status: PROCESSING_STATUS.FAILED,
              message: "No worker was available to process this request.",
            },
          );

          await this.processingReportStatusService
            .execute({
              processing_id: processing.id,
            })
            .catch(() => null);

          count += 1;
        } catch (error) {
          const err = AppError.make({
            key: "@processing_fail_dangling_service/ERROR",
            message: `Fail to fail long dangling processing ${processing.id}. ${error}`,
            debug: {
              expiredProcesses,
              error,
            },
          });

          logger.error(err);
        }
      }),
    );

    return count;
  }
}

export { ProcessingFailDanglingService };
