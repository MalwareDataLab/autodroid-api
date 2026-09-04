import { inject, injectable } from "tsyringe";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedProcessor } from "@modules/processor/entities/processor.entity";

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
