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

// Helper import
import { isValidCommaSeparatedString } from "@shared/utils/isValidCommaSeparatedString";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Schema import
import { AdminDatasetUpdateSchema } from "../schemas/adminDataset.schema";

interface IRequest {
  dataset_id: string;
  data: AdminDatasetUpdateSchema;

  user: User;
  language: string;
}

@injectable()
class AdminDatasetUpdateService {
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
        key: "@admin_dataset_update_service/DATASET_NOT_FOUND",
        message: t(
          "@admin_dataset_update_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
      });

    if (!!data.description && typeof data.description !== "string")
      throw new AppError({
        key: "@dataset_create_service/INVALID_DESCRIPTION",
        message: t(
          "@dataset_create_service/INVALID_DESCRIPTION",
          "Invalid description.",
        ),
      });

    if (!!data.tags && !isValidCommaSeparatedString(data.tags))
      throw new AppError({
        key: "@dataset_create_service/TAGS_NOT_PROVIDED",
        message: t(
          "@dataset_create_service/TAGS_NOT_PROVIDED",
          "Tags must be a comma-separated list.",
        ),
      });

    const updatedDataset = await this.datasetRepository.updateOne(
      { id: dataset_id },
      {
        description: data.description ? String(data.description).trim() : null,
        tags: data.tags
          ? String(data.tags)
              .split(",")
              .map(tag => tag.trim())
              .join(",")
          : null,
      },
    );

    if (!updatedDataset)
      throw new AppError({
        key: "@admin_dataset_update_service/DATASET_NOT_UPDATED",
        message: t(
          "@admin_dataset_update_service/DATASET_NOT_UPDATED",
          "Dataset not updated.",
        ),
      });

    return updatedDataset;
  }
}

export { AdminDatasetUpdateService };
