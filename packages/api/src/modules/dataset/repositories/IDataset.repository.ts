// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateDatasetDTO,
  IFindDatasetDTO,
  IFindDatasetPublicOrUserPrivateDTO,
  IUpdateDatasetDTO,
} from "../types/IDataset.dto";

// Entity import
import { Dataset } from "../entities/dataset.entity";

export interface IDatasetRepository {
  createOne(data: ICreateDatasetDTO): Promise<Dataset>;

  findOne(filter: IFindDatasetDTO): Promise<Dataset | null>;
  findMany(
    filter: IFindDatasetDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof DatasetSortingOptions>,
  ): Promise<Dataset[]>;
  findManyPublicOrUserPrivate(
    filter: IFindDatasetPublicOrUserPrivateDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof DatasetSortingOptions>,
  ): Promise<Dataset[]>;

  getCount(filter: IFindDatasetDTO): Promise<number>;
  getCountPublicOrUserPrivate(
    filter: IFindDatasetPublicOrUserPrivateDTO,
  ): Promise<number>;

  updateOne(
    filter: IFindDatasetDTO,
    data: IUpdateDatasetDTO,
  ): Promise<Dataset | null>;

  deleteOne(filter: IFindDatasetDTO): Promise<Dataset | null>;
}
