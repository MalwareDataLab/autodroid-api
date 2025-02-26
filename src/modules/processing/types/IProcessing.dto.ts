// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { Processing } from "../entities/processing.entity";

export type ProcessingRelationFields = keyof Pick<
  Processing,
  "user" | "processor" | "dataset" | "worker" | "result_file" | "metrics_file"
>;

export type ProcessingForeignKeys = keyof Pick<
  Processing,
  | "user_id"
  | "processor_id"
  | "dataset_id"
  | "worker_id"
  | "result_file_id"
  | "metrics_file_id"
>;

export type IProcessingBase = Omit<Processing, ProcessingRelationFields>;

export type ICreateProcessingDTO = Omit<
  Processing,
  // Base
  | BaseEntityFields
  // Relations
  | ProcessingRelationFields
>;

export type IUpdateProcessingDTO = Partial<
  Omit<
    ICreateProcessingDTO,
    keyof Pick<Processing, "user_id" | "processor_id" | "dataset_id">
  >
>;

export type IFindProcessingDTO = Partial<
  Pick<Processing, "id" | "status" | "visibility" | ProcessingForeignKeys>
> & {
  started?: boolean;
  finished?: boolean;

  keep_until_start_date?: Date;
  keep_until_end_date?: Date;

  created_at_start_date?: Date;
  created_at_end_date?: Date;

  include_archived?: boolean;
};

export type IFindProcessingPublicOrUserPrivateDTO = Pick<
  Processing,
  "user_id"
> &
  IFindProcessingDTO;

export type IProcessingEstimatedDatasetProcessingTimeFilterDTO = {
  dataset_id: string;
  processor_id: string;
};

export type IProcessingEstimatedDatasetProcessingTimeDTO =
  IProcessingEstimatedDatasetProcessingTimeFilterDTO & {
    average_execution_time_seconds: number;
  };
