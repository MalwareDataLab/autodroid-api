import { inject, injectable } from "tsyringe";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Entity import
import { PaginatedProcessing } from "@modules/processing/entities/processing.entity";
import { User } from "@modules/user/entities/user.entity";

// Schema import
import { AdminProcessingIndexSchema } from "../schemas/adminProcessing.schema";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

interface IRequest {
  filter: AdminProcessingIndexSchema;
  user: User;

  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof ProcessingSortingOptions>;
}

@injectable()
class AdminProcessingIndexService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    filter,
    pagination,
    sorting,
  }: IRequest): Promise<PaginatedProcessing> {
    const totalCount = await this.processingRepository.getCount(filter);

    const processes = await this.processingRepository.findMany(
      filter,
      pagination,
      sorting,
    );

    return PaginatedProcessing.make({
      items: processes,
      totalCount,
      paginationRequest: pagination,
    });
  }
}

export { AdminProcessingIndexService };
