// Util import
import { DefaultSortingOptions } from "@modules/sorting/utils/makeSortingObj";

// Entity import
import { Worker } from "../entities/worker.entity";

export const WorkerSortingOptions = [...DefaultSortingOptions] as const;

export type IWorkerSortingOptionsMap = EntitySortingOptionsMap<
  Worker,
  (typeof WorkerSortingOptions)[number]
>;
