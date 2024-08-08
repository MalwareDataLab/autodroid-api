import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IFileRepository } from "@shared/container/repositories";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

interface IRequest {
  dataset_id: string;

  user: User;
  language: string;
}

@injectable()
class UserDatasetDeleteService {
  constructor(
    @inject("StorageProvider")
    private storageProvider: IStorageProvider,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("FileRepository")
    private fileRepository: IFileRepository,
  ) {}

  public async execute({
    dataset_id,
    user,
    language,
  }: IRequest): Promise<Dataset> {
    const t = await i18n(language);

    const dataset = await this.datasetRepository.findOne({
      id: dataset_id,
      user_id: user.id,
    });

    if (!dataset)
      throw new AppError({
        key: "@user_dataset_delete_service/DATASET_NOT_FOUND",
        message: t(
          "@user_dataset_delete_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
      });

    if (dataset.visibility !== DATASET_VISIBILITY.PRIVATE)
      throw new AppError({
        key: "@user_dataset_delete_service/DATASET_NOT_EDITABLE",
        message: t(
          "@user_dataset_delete_service/DATASET_NOT_EDITABLE",
          "Dataset not editable.",
        ),
      });

    const file = await this.fileRepository.findOne({
      id: dataset.file.id,
    });

    if (!file)
      throw new AppError({
        key: "@user_dataset_delete_service/FILE_NOT_FOUND",
        message: t(
          "@user_dataset_delete_service/FILE_NOT_FOUND",
          "File not found.",
        ),
      });

    await this.datasetRepository.deleteOne({
      id: dataset.id,
    });

    await this.fileRepository.deleteOne({
      id: file.id,
    });

    await this.storageProvider.removeFileByPath({
      path: file.provider_path,
      language,
    });

    return dataset;
  }
}

export { UserDatasetDeleteService };
