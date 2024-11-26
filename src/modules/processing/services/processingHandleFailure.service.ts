import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

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
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

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

    return updatedProcessing;
  }
}

export { ProcessingHandleFailureService };
