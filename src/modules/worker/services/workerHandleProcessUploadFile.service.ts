import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";
import { File } from "@modules/file/entities/file.entity";
import { Worker } from "../entities/worker.entity";

interface IRequest {
  worker: Worker;
  processing_id: string;
}

@injectable()
class WorkerHandleProcessUploadFileService {
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
        key: "@worker_handle_process_upload_file/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    if (!processing.result_file?.id)
      throw new AppError({
        key: "@worker_handle_process_upload_file/RESULT_FILE_NOT_FOUND",
        message: "Result file not found.",
      });

    const file = await File.process(processing.result_file);

    if (!file.public_url || file.provider_status !== FILE_PROVIDER_STATUS.READY)
      throw new AppError({
        key: "@worker_handle_process_upload_file/RESULT_NOT_AVAILABLE",
        message: "Result file not sent.",
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
        key: "@worker_handle_process_upload_file/PROCESSING_UPDATE_FAILED",
        message: "Processing update failed.",
      });

    return updatedProcessing;
  }
}

export { WorkerHandleProcessUploadFileService };
