// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateProcessingDTO,
  IFindProcessingDTO,
  IFindProcessingPublicOrUserPrivateDTO,
  IProcessingEstimatedDatasetProcessingTimeDTO,
  IProcessingEstimatedDatasetProcessingTimeFilterDTO,
  IUpdateProcessingDTO,
} from "../types/IProcessing.dto";

// Entity import
import { Processing } from "../entities/processing.entity";

export interface IProcessingRepository {
  createOne(data: ICreateProcessingDTO): Promise<Processing>;

  findOne(filter: IFindProcessingDTO): Promise<Processing | null>;
  findMany(
    filter: IFindProcessingDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof ProcessingSortingOptions>,
  ): Promise<Processing[]>;
  findManyPublicOrUserPrivate(
    filter: IFindProcessingPublicOrUserPrivateDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof ProcessingSortingOptions>,
  ): Promise<Processing[]>;

  getCount(filter: IFindProcessingDTO): Promise<number>;
  getCountPublicOrUserPrivate(
    filter: IFindProcessingPublicOrUserPrivateDTO,
  ): Promise<number>;

  updateOne(
    filter: IFindProcessingDTO,
    data: IUpdateProcessingDTO,
  ): Promise<Processing | null>;

  deleteOne(filter: IFindProcessingDTO): Promise<Processing | null>;

  getOneEstimatedExecutionTime(
    filter: IProcessingEstimatedDatasetProcessingTimeFilterDTO,
  ): Promise<IProcessingEstimatedDatasetProcessingTimeDTO | null>;

  getManyEstimatedExecutionTimes(): Promise<
    IProcessingEstimatedDatasetProcessingTimeDTO[]
  >;
}
