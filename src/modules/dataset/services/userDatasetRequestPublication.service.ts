import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Guard import
import { DatasetGuard } from "../guards/dataset.guard";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

interface IRequest {
  dataset_id: string;

  user: User;
  language: string;
}

@injectable()
class UserDatasetRequestPublicationService {
  private datasetGuard: DatasetGuard;

  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {
    this.datasetGuard = new DatasetGuard(this.datasetRepository);
  }

  public async execute({
    dataset_id,
    user,
    language,
  }: IRequest): Promise<Dataset> {
    const { dataset, t } = await this.datasetGuard.execute({
      user,
      dataset_id,
      language,
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
        key: "@user_dataset_request_publication_service/DATASET_NOT_UPDATED",
        message: t(
          "@user_dataset_request_publication_service/DATASET_NOT_UPDATED",
          "Dataset not updated.",
        ),
      });

    return updatedDataset;
  }
}

export { UserDatasetRequestPublicationService };
