import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IFileRepository } from "@shared/container/repositories";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

interface IRequest {
  dataset_id: string;

  user: User;
  language: string;
}

@injectable()
class AdminDatasetDeleteService {
  constructor(
    @inject("StorageProvider")
    private storageProvider: IStorageProvider,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("FileRepository")
    private fileRepository: IFileRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({ dataset_id, language }: IRequest): Promise<Dataset> {
    const t = await i18n(language);

    const dataset = await this.datasetRepository.findOne({
      id: dataset_id,
    });

    if (!dataset)
      throw new AppError({
        key: "@admin_dataset_delete_service/DATASET_NOT_FOUND",
        message: t(
          "@admin_dataset_delete_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
      });

    const file = await this.fileRepository.findOne({
      id: dataset.file.id,
    });

    if (!file)
      throw new AppError({
        key: "@admin_dataset_delete_service/FILE_NOT_FOUND",
        message: t(
          "@admin_dataset_delete_service/FILE_NOT_FOUND",
          "File not found.",
        ),
      });

    await this.datasetRepository.deleteOne({
      id: dataset.id,
    });

    await this.storageProvider.removeFileByPath({
      path: file.provider_path,
      language,
    });

    return dataset;
  }
}

export { AdminDatasetDeleteService };
