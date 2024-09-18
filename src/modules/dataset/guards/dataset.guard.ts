import { inject, injectable } from "tsyringe";

// i18n import
import { i18n, TFunction } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Repository import
import { IDatasetRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

interface IRequest {
  user: User;
  dataset_id: string;
  language: string;
}

type IResponse = {
  dataset: Dataset;
  t: TFunction;
};

@injectable()
class DatasetGuard {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  public async execute(params: IRequest): Promise<IResponse> {
    const { user, dataset_id, language } = params;
    const t = await i18n(language);

    const dataset = await this.datasetRepository.findOne({
      id: dataset_id,
    });

    if (!dataset)
      throw new AppError({
        key: "@dataset_guard/DATASET_NOT_FOUND",
        message: t("@dataset_guard/DATASET_NOT_FOUND", "Dataset not found."),
      });

    if (!user.is_admin) {
      if (
        dataset.visibility !== DATASET_VISIBILITY.PUBLIC &&
        dataset.user_id !== user.id
      )
        throw new AppError({
          key: "@dataset_guard/DATASET_NOT_PUBLIC",
          message: t(
            "@dataset_guard/DATASET_NOT_PUBLIC",
            "Dataset not public.",
          ),
        });
    }

    return {
      dataset,
      t,
    };
  }
}

export { DatasetGuard };
