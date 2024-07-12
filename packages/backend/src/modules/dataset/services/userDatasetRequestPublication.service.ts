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

interface IRequest {
  dataset_id: string;

  user: User;
  language: string;
}

@injectable()
class UserDatasetRequestPublicationService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
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
        key: "@user_dataset_request_publication_service/DATASET_NOT_FOUND",
        message: t(
          "@user_dataset_request_publication_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
        statusCode: 401,
      });

    if (dataset.visibility !== DATASET_VISIBILITY.PRIVATE)
      throw new AppError({
        key: "@user_dataset_request_publication_service/DATASET_NOT_EDITABLE",
        message: t(
          "@user_dataset_request_publication_service/DATASET_NOT_EDITABLE",
          "Dataset not editable.",
        ),
      });

    const updatedDataset = await this.datasetRepository.updateOne(
      {
        id: dataset_id,
        user_id: user.id,
      },
      { visibility: DATASET_VISIBILITY.UNDER_REVIEW },
    );

    if (!updatedDataset)
      throw new AppError({
        key: "@dataset_update_service/DATASET_NOT_UPDATED",
        message: t(
          "@dataset_update_service/DATASET_NOT_UPDATED",
          "Dataset not updated.",
        ),
      });

    return updatedDataset;
  }
}

export { UserDatasetRequestPublicationService };
