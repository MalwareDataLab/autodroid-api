import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

interface IRequest {
  dataset_id: string;

  user: User;
  language: string;
}

@injectable()
class UserDatasetShowService {
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
        key: "@user_dataset_show_service/DATASET_NOT_FOUND",
        message: t(
          "@user_dataset_show_service/DATASET_NOT_FOUND",
          "Dataset not found.",
        ),
      });

    return dataset;
  }
}

export { UserDatasetShowService };
