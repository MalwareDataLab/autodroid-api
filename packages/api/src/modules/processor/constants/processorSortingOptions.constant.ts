// Util import
import { DefaultSortingOptions } from "@modules/sorting/utils/makeSortingObj";

// Entity import
import { Processor } from "../entities/processor.entity";

export const ProcessorSortingOptions = [...DefaultSortingOptions] as const;

export type IProcessorSortingOptionsMap = EntitySortingOptionsMap<
  Processor,
  (typeof ProcessorSortingOptions)[number]
>;
