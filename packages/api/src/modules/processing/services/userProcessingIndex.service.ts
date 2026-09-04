import { inject, injectable } from "tsyringe";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Repository import
import {
  IDatasetRepository,
  IProcessorRepository,
} from "@shared/container/repositories";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedProcessing } from "../entities/processing.entity";

// Guard import
import { ProcessingGuard } from "../guards/processing.guard";

// DTO import
import { IFindProcessingDTO } from "../types/IProcessing.dto";

// Schema import
import { ProcessingIndexSchema } from "../schemas/processingIndex.schema";

interface IRequest {
  user: User;

  params: ProcessingIndexSchema;

  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof ProcessingSortingOptions>;

  language: string;
}

@injectable()
class UserProcessingIndexService {
  private processingGuard: ProcessingGuard;
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,
  ) {
    this.processingGuard = new ProcessingGuard(
      this.processingRepository,
      this.datasetRepository,
      this.processorRepository,
    );
  }

  public async execute({
    user,

    params,

    pagination,
    sorting,

    language,
  }: IRequest): Promise<PaginatedProcessing> {
    const filter = {
      user_id: user.id,

      dataset_id: params.dataset_id,
      processor_id: params.processor_id,

      status: params.status,

      started: params.started,
      finished: params.finished,
    } satisfies IFindProcessingDTO;

    await this.processingGuard.execute({
      dataset_id: filter.dataset_id,
      processor_id: filter.processor_id,

      user,
      language,
    });

    const totalCount =
      await this.processingRepository.getCountPublicOrUserPrivate(filter);

    const processes =
      await this.processingRepository.findManyPublicOrUserPrivate(
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

export { UserProcessingIndexService };
