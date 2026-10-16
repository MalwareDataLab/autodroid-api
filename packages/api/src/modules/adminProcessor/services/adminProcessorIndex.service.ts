import { inject, injectable } from "tsyringe";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Entity import
import { PaginatedProcessor } from "@modules/processor/entities/processor.entity";
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

interface IRequest {
  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof ProcessorSortingOptions>;

  user: User;
  language: string;
}

@injectable()
class AdminProcessorIndexService {
  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    pagination,
    sorting,
  }: IRequest): Promise<PaginatedProcessor> {
    const totalCount = await this.processorRepository.getCount({});

    const processors = await this.processorRepository.findMany(
      {},
      pagination,
      sorting,
    );

    return PaginatedProcessor.make({
      items: processors,
      totalCount,
      paginationRequest: pagination,
    });
  }
}

export { AdminProcessorIndexService };
