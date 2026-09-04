import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Worker } from "../entities/worker.entity";

interface IRequest {
  worker: Worker;
  processing_id: string;
}

@injectable()
class WorkerHandleProcessingResultUploadFileService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  public async execute({ worker, processing_id }: IRequest): Promise<File> {
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@worker_handle_processing_result_upload_file_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    if (!processing.result_file?.id)
      throw new AppError({
        key: "@worker_handle_processing_result_upload_file_service/RESULT_FILE_NOT_FOUND",
        message: "Result file not found.",
      });

    const file = await File.process(processing.result_file);

    if (!file.public_url || file.provider_status !== FILE_PROVIDER_STATUS.READY)
      throw new AppError({
        key: "@worker_handle_processing_result_upload_file_service/RESULT_NOT_AVAILABLE",
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

    if (!updatedProcessing?.result_file)
      throw new AppError({
        key: "@worker_handle_processing_result_upload_file_service/PROCESSING_UPDATE_FAILED",
        message: "Processing update failed.",
      });

    return updatedProcessing.result_file;
  }
}

export { WorkerHandleProcessingResultUploadFileService };
