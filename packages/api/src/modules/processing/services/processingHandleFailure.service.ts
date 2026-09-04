import { inject, injectable } from "tsyringe";

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
  processing_ids: string[];
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
    processing_ids,
    message,
  }: IRequest): Promise<Processing[]> {
    const processes = await Promise.all(
      processing_ids.map(async processing_id => {
        return this.processingRepository.findOne({
          id: processing_id,
        });
      }),
    );

    const notStartedProcesses = processes.filter(
      processing => !!processing && !processing.started_at,
    );

    const failedProcesses = await Promise.all(
      notStartedProcesses.map(async processing => {
        const updatedProcessing = await this.processingRepository.updateOne(
          { id: processing!.id },
          {
            verified_at: new Date(),
            started_at: new Date(),
            finished_at: new Date(),

            status: PROCESSING_STATUS.FAILED,
            message,
          },
        );

        await this.processingReportStatusService.execute({
          processing_id: updatedProcessing.id,
        });

        return updatedProcessing;
      }),
    );

    return failedProcesses;
  }
}

export { ProcessingHandleFailureService };
