// Util import
import { DefaultSortingOptions } from "@modules/sorting/utils/makeSortingObj";

// Entity import
import { WorkerRegistrationToken } from "../entities/workerRegistrationToken.entity";

export const WorkerRegistrationTokenSortingOptions = [
  ...DefaultSortingOptions,
] as const;

export type IWorkerRegistrationTokenSortingOptionsMap = EntitySortingOptionsMap<
  WorkerRegistrationToken,
  (typeof WorkerRegistrationTokenSortingOptions)[number]
>;
