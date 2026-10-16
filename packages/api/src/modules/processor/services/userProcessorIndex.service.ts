import { inject, injectable } from "tsyringe";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedProcessor } from "../entities/processor.entity";

// Repository import
import { IProcessorRepository } from "../repositories/IProcessor.repository";

interface IRequest {
  user: User;
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
    user,
    pagination,
    sorting,
  }: IRequest): Promise<PaginatedProcessor> {
    const filter = {
      user_id: user.id,
    };

    const totalCount =
      await this.processorRepository.getCountPublicOrUserPrivate(filter);

    const processors =
      await this.processorRepository.findManyPublicOrUserPrivate(
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
