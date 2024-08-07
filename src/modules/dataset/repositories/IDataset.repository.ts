// Entity import
import { Dataset } from "../entities/dataset.entity";

// DTO import
import {
  ICreateDatasetDTO,
  IFindDatasetDTO,
  IFindManyPublicOrUserPrivateDTO,
  IUpdateDatasetDTO,
} from "../types/IDataset.dto";

export interface IDatasetRepository {
  createOne(data: ICreateDatasetDTO): Promise<Dataset>;

  findOne(filter: IFindDatasetDTO): Promise<Dataset | null>;
  findMany(filter: IFindDatasetDTO): Promise<Dataset[]>;
  findManyPublicOrUserPrivate({
    user_id,
  }: IFindManyPublicOrUserPrivateDTO): Promise<Dataset[]>;

  updateOne(
    filter: IFindDatasetDTO,
    data: IUpdateDatasetDTO,
  ): Promise<Dataset | null>;

  deleteOne(filter: IFindDatasetDTO): Promise<Dataset | null>;
}
