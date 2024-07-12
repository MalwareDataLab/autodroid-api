import { DatasetProcessorProvider as Provider } from "./implementations/datasetProcessorProvider";

const providers = {
  dataset: Provider,
};

const DatasetProcessorProvider = providers.dataset;

export { DatasetProcessorProvider };
