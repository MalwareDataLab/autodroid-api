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

// Schema import
import { WorkerHandleProcessFailureSchema } from "../schemas/workerHandleProcessFailure.schema";

interface IRequest {
  worker: Worker;
  processing_id: string;
  data?: WorkerHandleProcessFailureSchema | null;
}

@injectable()
class WorkerHandleProcessingFailureService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  public async execute({
    worker,
    processing_id,
    data,
  }: IRequest): Promise<Processing> {
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@worker_handle_processing_failure_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      {
        verified_at: new Date(),
        started_at: processing.started_at || new Date(),
        finished_at: new Date(),

        worker_id: worker.id,
        status: PROCESSING_STATUS.FAILED,
        message: data?.reason || null,
      },
    );

    if (!updatedProcessing)
      throw new AppError({
        key: "@worker_handle_processing_failure_service/PROCESSING_UPDATE_FAILED",
        message: "Processing update failed.",
      });

    return updatedProcessing;
  }
}

export { WorkerHandleProcessingFailureService };
