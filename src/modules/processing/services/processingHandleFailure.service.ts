import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Service import
import { ProcessingReportStatusService } from "@modules/processing/services/processingReportStatus.service";

// Entity import
import { Processing } from "../entities/processing.entity";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

interface IRequest {
  processing_id: string;
  message: string;
}

@injectable()
class ProcessingHandleFailureService {
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
    processing_id,
    message,
  }: IRequest): Promise<Processing> {
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@processing_handle_failure_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      {
        verified_at: new Date(),
        started_at: processing.started_at || new Date(),
        finished_at: new Date(),

        status: PROCESSING_STATUS.FAILED,
        message,
      },
    );

    if (!updatedProcessing)
      throw new AppError({
        key: "@processing_handle_failure_service/PROCESSING_UPDATE_FAILED",
        message: "Fail to update processing.",
      });

    await this.processingReportStatusService.execute({
      processing_id: updatedProcessing.id,
    });

    return updatedProcessing;
  }
}

export { ProcessingHandleFailureService };
