// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { File } from "../entities/file.entity";

export type FileRelationFields = "dataset" | "processes";

export type IFileBase = Omit<File, FileRelationFields>;

export type ICreateFileDTO = Omit<
  File,
  // Base
  | BaseEntityFields
  // Relations
  | FileRelationFields
>;

export type IFindFileDTO = AtLeastOneProperty<
  Partial<Pick<File, "id" | "provider_path" | "public_url">>
>;

export type IUpdateFileDTO = Partial<ICreateFileDTO>;
