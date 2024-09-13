// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { Worker } from "../entities/worker.entity";

export type WorkerComputedFields = "status";

export type WorkerRelationFields = "user" | "registration_token";

export type IWorkerBase = Omit<
  Worker,
  WorkerComputedFields | WorkerRelationFields
>;

export type ICreateWorkerDTO = Omit<
  Worker,
  // Base
  | BaseEntityFields
  // Computed fields (calculated at entity level)
  | WorkerComputedFields
  // Relations
  | WorkerRelationFields
>;

export type IFindWorkerDTO = Partial<
  Pick<Worker, "id" | "refresh_token" | "user_id" | "registration_token_id">
> & {
  archived?: boolean;
};

export type IUpdateWorkerDTO = Partial<ICreateWorkerDTO>;
