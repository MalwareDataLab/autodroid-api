import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Processing } from "@modules/processing/entities/processing.entity";
import { Worker } from "../entities/worker.entity";

interface IRequest {
  worker: Worker;
  processing_id: string;
}

@injectable()
class WorkerHandleProcessingSuccessService {
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
        key: "@worker_handle_processing_success_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    if (!processing.result_file?.id)
      throw new AppError({
        key: "@worker_handle_processing_success_service/RESULT_FILE_NOT_FOUND",
        message: "Result file not found.",
      });

    if (!processing.metrics_file?.id)
      throw new AppError({
        key: "@worker_handle_processing_success_service/METRICS_FILE_NOT_FOUND",
        message: "Metrics file not found.",
      });

    const files = await Promise.all([
      File.process(processing.result_file),
      File.process(processing.metrics_file),
    ]);

    files.forEach(file => {
      if (
        !file.public_url ||
        file.provider_status !== FILE_PROVIDER_STATUS.READY
      )
        throw new AppError({
          key: "@worker_handle_processing_success_service/FILE_NOT_AVAILABLE",
          message: "Some of the required files are not available.",
        });
    });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      {
        verified_at: new Date(),
        started_at: processing.started_at || new Date(),
        finished_at: new Date(),

        worker_id: worker.id,
        status: PROCESSING_STATUS.SUCCEEDED,
      },
    );

    if (!updatedProcessing)
      throw new AppError({
        key: "@worker_handle_processing_success_service/PROCESSING_UPDATE_FAILED",
        message: "Processing update failed.",
      });

    return updatedProcessing;
  }
}

export { WorkerHandleProcessingSuccessService };
