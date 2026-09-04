import { inject, injectable } from "tsyringe";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

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
class UserDatasetShowService {
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
    const { dataset } = await this.datasetGuard.execute({
      user,
      dataset_id,
      language,
    });

    return dataset;
  }
}

export { UserDatasetShowService };
