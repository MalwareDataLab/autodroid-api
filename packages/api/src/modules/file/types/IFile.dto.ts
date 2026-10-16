// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { File } from "../entities/file.entity";

export type FileComputedFields = keyof Pick<File, "__type">;

export type FileRelationFields = keyof Pick<
  File,
  "dataset" | "processing_results" | "processing_metrics"
>;

export type IFileBase = Omit<File, FileRelationFields | FileComputedFields>;

export type ICreateFileDTO = Omit<
  File,
  // Base
  | BaseEntityFields
  // Relations
  | FileRelationFields
  // Computed
  | FileComputedFields
>;

export type IFindFileDTO = AtLeastOneProperty<
  Partial<Pick<File, "id" | "provider_path" | "public_url" | "provider_status">>
> & {
  upload_url_expires_start_date?: Date;
  upload_url_expires_end_date?: Date;
};

export type IUpdateFileDTO = Partial<ICreateFileDTO>;
