// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { Dataset } from "../entities/dataset.entity";

export type DatasetRelationFields = "user" | "file" | "processes";

export type DatasetForeignKeys = "user_id" | "file_id";

export type IDatasetBase = Omit<Dataset, DatasetRelationFields>;

export type ICreateDatasetDTO = Omit<
  Dataset,
  // Base
  | BaseEntityFields
  // Relations
  | DatasetRelationFields
>;

export type IUpdateDatasetDTO = Partial<
  Omit<ICreateDatasetDTO, DatasetForeignKeys>
>;

export type IFindDatasetDTO = Partial<
  Pick<Dataset, "id" | "user_id" | "file_id" | "visibility">
>;

export type IFindDatasetPublicOrUserPrivateDTO = IFindDatasetDTO &
  Pick<Dataset, "user_id">;
