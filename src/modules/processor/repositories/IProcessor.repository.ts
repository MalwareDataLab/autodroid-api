// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateProcessorDTO,
  IFindProcessorDTO,
  IUpdateProcessorDTO,
} from "../types/IProcessor.dto";

// Entity import
import { Processor } from "../entities/processor.entity";

export interface IProcessorRepository {
  createOne(data: ICreateProcessorDTO): Promise<Processor>;

  findOne(filter: IFindProcessorDTO): Promise<Processor | null>;
  findMany(
    filter: IFindProcessorDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof ProcessorSortingOptions>,
  ): Promise<Processor[]>;

  getAllowedMimeTypes(): Promise<string[]>;

  getCount(filter: IFindProcessorDTO): Promise<number>;

  updateOne(
    filter: IFindProcessorDTO,
    data: IUpdateProcessorDTO,
  ): Promise<Processor | null>;

  deleteOne(filter: IFindProcessorDTO): Promise<Processor | null>;
}
