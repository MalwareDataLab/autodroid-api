import { inject, injectable } from "tsyringe";

// i18n import
import { DEFAULT_LANGUAGE } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IProcessingRepository } from "@shared/container/repositories";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Enum import
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";

// Entity import
import { Worker } from "../entities/worker.entity";

interface IRequest {
  worker: Worker;
  processing_id: string;
  data: RequestFileUploadSignedUrlSchema;
  agent_info?: IParsedUserAgentInfoDTO;
}

@injectable()
class WorkerGenerateProcessingResultUploadFileService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {}

  public async execute({
    worker,
    processing_id,
    agent_info,
    data,
  }: IRequest): Promise<File> {
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@worker_generate_processing_result_upload_file_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    if (processing.result_file?.id)
      await this.storageProvider.removeFileByPath({
        path: processing.result_file.provider_path,
        language: DEFAULT_LANGUAGE,
      });

    const file = await this.storageProvider.generateUploadSignedUrl({
      filename: data.filename,
      mimeType: data.mime_type,
      fileType: FILE_TYPE.PROCESSING_RESULT,
      size: data.size,
      md5Hash: data.md5_hash,

      cloudDirDestination: "processing_results",
      allowPublicAccess: true,

      user: processing.user,
      agentInfo: agent_info,
    });

    const updatedProcessing = await this.processingRepository.updateOne(
      { id: processing_id },
      {
        verified_at: new Date(),
        started_at: processing.started_at || new Date(),
        finished_at: null,

        worker_id: worker.id,
        status: PROCESSING_STATUS.RUNNING,

        result_file_id: file.id,
      },
    );

    if (!updatedProcessing?.result_file)
      throw new AppError({
        key: "@worker_generate_processing_result_upload_file_service/PROCESSING_UPDATE_FAILED",
        message: "Processing update failed.",
      });

    return updatedProcessing.result_file;
  }
}

export { WorkerGenerateProcessingResultUploadFileService };
