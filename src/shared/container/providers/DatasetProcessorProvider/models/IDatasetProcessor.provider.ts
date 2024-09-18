export interface IDatasetProcessorProvider {
  readonly initialization: Promise<void>;
}
