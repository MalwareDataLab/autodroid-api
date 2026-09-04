import { inject, injectable } from "tsyringe";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedProcessing } from "@modules/processing/entities/processing.entity";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Schema import
import { AdminProcessingIndexSchema } from "../schemas/adminProcessing.schema";

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
