import { inject, injectable } from "tsyringe";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "../entities/dataset.entity";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

interface IRequest {
  user: User;
}

@injectable()
class UserDatasetIndexService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  public async execute({ user }: IRequest): Promise<Dataset[]> {
    const datasets = await this.datasetRepository.findManyPublicOrUserPrivate({
      user_id: user.id,
    });
    return datasets;
  }
}

export { UserDatasetIndexService };
