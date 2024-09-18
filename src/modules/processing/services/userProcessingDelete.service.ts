import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processing } from "../entities/processing.entity";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

interface IRequest {
  user: User;

  processing_id: string;

  language: string;
}

@injectable()
class UserProcessingDeleteService {
  private processingGuard: ProcessingGuard;
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {
    this.processingGuard = new ProcessingGuard(
      this.processingRepository,
      this.datasetRepository,
      this.processorRepository,
    );
  }

  public async execute({
    user,

    processing_id,

    language,
  }: IRequest): Promise<Processing> {
    const { processing, t } = await this.processingGuard.execute({
      processing_id,

      user,
      language,
    });

    if (processing.user_id !== user.id)
      throw new AppError({
        key: "@user_processing_delete_service/CANNOT_DELETE_PROCESSING",
        message: t(
          "@user_processing_delete_service/CANNOT_DELETE_PROCESSING",
          "You cannot delete a processing that not belongs to you.",
        ),
      });

    if (processing.result_file) {
      await this.storageProvider.removeFileByPath({
        path: processing.result_file.provider_path,
        language,
      });
    }

    await this.processingRepository.deleteOne({
      id: processing.id,
    });

    return processing;
  }
}

export { UserProcessingDeleteService };
