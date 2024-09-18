// Util import
import { DefaultSortingOptions } from "@modules/sorting/utils/makeSortingObj";

// Entity import
import { Processing } from "../entities/processing.entity";

export const ProcessingSortingOptions = [...DefaultSortingOptions] as const;

export type IProcessingSortingOptionsMap = EntitySortingOptionsMap<
  Processing,
  (typeof ProcessingSortingOptions)[number]
>;
