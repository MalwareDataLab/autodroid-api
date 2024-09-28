import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";
import { Worker } from "../entities/worker.entity";

interface IRequest {
  worker: Worker;
  processing_id: string;
}

@injectable()
class WorkerHandleProcessProgressService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  public async execute({
    worker,
    processing_id,
  }: IRequest): Promise<Processing> {
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@worker_handle_process_progress_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      {
        verified_at: new Date(),
        started_at: processing.started_at || new Date(),
        finished_at: null,

        worker_id: worker.id,
        status: PROCESSING_STATUS.RUNNING,
      },
    );

    if (!updatedProcessing)
      throw new AppError({
        key: "@worker_handle_process_progress_service/PROCESSING_UPDATE_FAILED",
        message: "Processing update failed.",
      });

    return updatedProcessing;
  }
}

export { WorkerHandleProcessProgressService };
