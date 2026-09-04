import { inject, injectable } from "tsyringe";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedDataset } from "../entities/dataset.entity";

// Repository import
import { IDatasetRepository } from "../repositories/IDataset.repository";

interface IRequest {
  user: User;

  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof DatasetSortingOptions>;
}

@injectable()
class UserDatasetIndexService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  public async execute({
    user,
    pagination,
    sorting,
  }: IRequest): Promise<PaginatedDataset> {
    const filter = {
      user_id: user.id,
    };

    const totalCount =
      await this.datasetRepository.getCountPublicOrUserPrivate(filter);

    const datasets = await this.datasetRepository.findManyPublicOrUserPrivate(
      filter,
      pagination,
      sorting,
    );

    return PaginatedDataset.make({
      items: datasets,
      totalCount,
      paginationRequest: pagination,
    });
  }
}

export { UserDatasetIndexService };
