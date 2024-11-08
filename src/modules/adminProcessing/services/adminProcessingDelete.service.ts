import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

interface IRequest {
  processing_id: string;

  user: User;
  language: string;
}

@injectable()
class AdminProcessingDeleteService {
  constructor(
    @inject("StorageProvider")
    private storageProvider: IStorageProvider,

    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    processing_id,
    language,
  }: IRequest): Promise<Processing> {
    const t = await i18n(language);

    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@admin_processing_delete_service/PROCESSING_NOT_FOUND",
        message: t(
          "@admin_processing_delete_service/PROCESSING_NOT_FOUND",
          "Processing not found.",
        ),
      });

    if (processing.result_file) {
      await this.storageProvider.removeFileByPath({
        path: processing.result_file.provider_path,
        language,
      });
    }

    if (processing.metrics_file) {
      await this.storageProvider.removeFileByPath({
        path: processing.metrics_file.provider_path,
        language,
      });
    }

    await this.processingRepository.deleteOne({
      id: processing.id,
    });

    return processing;
  }
}

export { AdminProcessingDeleteService };
