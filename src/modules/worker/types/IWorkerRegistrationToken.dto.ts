// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { WorkerRegistrationToken } from "../entities/workerRegistrationToken.entity";

export type WorkerRegistrationTokenComputedFields = "status";

export type WorkerRegistrationTokenRelationFields = "user" | "workers";

export type IWorkerRegistrationTokenBase = Omit<
  WorkerRegistrationToken,
  WorkerRegistrationTokenComputedFields | WorkerRegistrationTokenRelationFields
>;

export type ICreateWorkerRegistrationTokenDTO = Omit<
  WorkerRegistrationToken,
  // Base
  | BaseEntityFields
  // Computed fields (calculated at entity level)
  | WorkerRegistrationTokenComputedFields
  // Relations
  | WorkerRegistrationTokenRelationFields
>;

export type IFindWorkerRegistrationTokenDTO = Partial<
  Pick<
    WorkerRegistrationToken,
    "id" | "token" | "is_unlimited_usage" | "user_id"
  >
> & {
  activated?: boolean;
  activatable?: boolean;
  expired?: boolean;
  archived?: boolean;
};

export type IUpdateWorkerRegistrationTokenDTO =
  Partial<ICreateWorkerRegistrationTokenDTO>;
