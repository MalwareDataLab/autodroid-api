import { inject, injectable } from "tsyringe";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Entity import
import { PaginatedProcessor } from "../entities/processor.entity";

// Repository import
import { IProcessorRepository } from "../repositories/IProcessor.repository";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

interface IRequest {
  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof ProcessorSortingOptions>;
}

@injectable()
class UserProcessorIndexService {
  constructor(
    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {}

  public async execute({
    pagination,
    sorting,
  }: IRequest): Promise<PaginatedProcessor> {
    const filter = {
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    };

    const totalCount = await this.processorRepository.getCount(filter);

    const processors = await this.processorRepository.findMany(
      filter,
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

export { UserProcessorIndexService };
