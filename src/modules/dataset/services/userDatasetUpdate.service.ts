import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

// Schema import
import { UserDatasetUpdateSchema } from "../schemas/userDataset.schema";

interface IRequest {
  dataset_id: string;
  data: UserDatasetUpdateSchema;

  user: User;
  language: string;
}

@injectable()
class UserDatasetUpdateService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  public async execute({
    dataset_id,
    data,
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
        key: "@user_dataset_update_service/DATASET_NOT_FOUND",
        message: t(
          "@user_dataset_update_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
      });

    if (dataset.visibility !== DATASET_VISIBILITY.PRIVATE)
      throw new AppError({
        key: "@user_dataset_update_service/DATASET_NOT_EDITABLE",
        message: t(
          "@user_dataset_update_service/DATASET_NOT_EDITABLE",
          "Dataset not editable.",
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

    if (
      !!data.tags &&
      !data.tags.split(",").every((tag: string) => tag.trim().length > 0)
    )
      throw new AppError({
        key: "@dataset_create_service/TAGS_NOT_PROVIDED",
        message: t(
          "@dataset_create_service/TAGS_NOT_PROVIDED",
          "Tags must be a comma-separated list.",
        ),
      });

    const updatedDataset = await this.datasetRepository.updateOne(
      {
        id: dataset_id,
        user_id: user.id,
      },
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
        key: "@user_dataset_update_service/DATASET_NOT_UPDATED",
        message: t(
          "@user_dataset_update_service/DATASET_NOT_UPDATED",
          "Dataset not updated.",
        ),
      });

    return updatedDataset;
  }
}

export { UserDatasetUpdateService };
