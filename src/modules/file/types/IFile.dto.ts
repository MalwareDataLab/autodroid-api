// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { File } from "../entities/file.entity";

export type FileRelationFields = keyof Pick<
  File,
  "dataset" | "processing_results" | "processing_metrics"
>;

export type IFileBase = Omit<File, FileRelationFields>;

export type ICreateFileDTO = Omit<
  File,
  // Base
  | BaseEntityFields
  // Relations
  | FileRelationFields
>;

export type IFindFileDTO = AtLeastOneProperty<
  Partial<Pick<File, "id" | "provider_path" | "public_url" | "provider_status">>
> & {
  upload_url_expires_start_date?: Date;
  upload_url_expires_end_date?: Date;
};

export type IUpdateFileDTO = Partial<ICreateFileDTO>;
