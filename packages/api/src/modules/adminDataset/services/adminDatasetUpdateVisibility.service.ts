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

// Schema import
import { AdminDatasetUpdateVisibilitySchema } from "../schemas/adminDataset.schema";

interface IRequest {
  dataset_id: string;
  data: AdminDatasetUpdateVisibilitySchema;

  user: User;
  language: string;
}

@injectable()
class AdminDatasetUpdateVisibilityService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    dataset_id,
    data,
    language,
  }: IRequest): Promise<Dataset> {
    const t = await i18n(language);

    const dataset = await this.datasetRepository.findOne({
      id: dataset_id,
    });

    if (!dataset)
      throw new AppError({
        key: "@admin_dataset_update_visibility_service/DATASET_NOT_FOUND",
        message: t(
          "@admin_dataset_update_visibility_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
      });

    const updatedDataset = await this.datasetRepository.updateOne(
      { id: dataset_id },
      { visibility: data.visibility },
    );

    if (!updatedDataset)
      throw new AppError({
        key: "@admin_dataset_update_visibility_service/DATASET_NOT_UPDATED",
        message: t(
          "@admin_dataset_update_visibility_service/DATASET_NOT_UPDATED",
          "Dataset not updated.",
        ),
      });

    return updatedDataset;
  }
}

export { AdminDatasetUpdateVisibilityService };
