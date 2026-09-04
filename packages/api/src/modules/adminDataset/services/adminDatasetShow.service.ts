import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

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
class AdminDatasetShowService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({ dataset_id, language }: IRequest): Promise<Dataset> {
    const t = await i18n(language);

    const dataset = await this.datasetRepository.findOne({
      id: dataset_id,
    });

    if (!dataset)
      throw new AppError({
        key: "@admin_dataset_show_service/DATASET_NOT_FOUND",
        message: t(
          "@admin_dataset_show_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
      });

    return dataset;
  }
}

export { AdminDatasetShowService };
