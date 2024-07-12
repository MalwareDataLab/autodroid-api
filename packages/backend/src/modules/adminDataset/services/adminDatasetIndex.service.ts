import { inject, injectable } from "tsyringe";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Schema import
import { AdminDatasetIndexSchema } from "../schemas/adminDataset.schema";

interface IRequest {
  filter: AdminDatasetIndexSchema;
  user: User;
}

@injectable()
class AdminDatasetIndexService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({ filter }: IRequest): Promise<Dataset[]> {
    const datasets = await this.datasetRepository.findMany(filter);
    return datasets;
  }
}

export { AdminDatasetIndexService };
