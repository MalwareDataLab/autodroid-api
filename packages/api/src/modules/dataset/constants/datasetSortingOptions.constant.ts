// Util import
import { DefaultSortingOptions } from "@modules/sorting/utils/makeSortingObj";

// Entity import
import { Dataset } from "../entities/dataset.entity";

export const DatasetSortingOptions = [...DefaultSortingOptions] as const;

export type IDatasetSortingOptionsMap = EntitySortingOptionsMap<
  Dataset,
  (typeof DatasetSortingOptions)[number]
>;
