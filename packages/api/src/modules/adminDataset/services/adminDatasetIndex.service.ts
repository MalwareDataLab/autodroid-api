import { inject, injectable } from "tsyringe";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedDataset } from "@modules/dataset/entities/dataset.entity";

// Repository import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Schema import
import { AdminDatasetIndexSchema } from "../schemas/adminDataset.schema";

interface IRequest {
  filter: AdminDatasetIndexSchema;
  user: User;

  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof DatasetSortingOptions>;
}

@injectable()
class AdminDatasetIndexService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    filter,
    pagination,
    sorting,
  }: IRequest): Promise<PaginatedDataset> {
    const totalCount = await this.datasetRepository.getCount(filter);

    const datasets = await this.datasetRepository.findMany(
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

export { AdminDatasetIndexService };
