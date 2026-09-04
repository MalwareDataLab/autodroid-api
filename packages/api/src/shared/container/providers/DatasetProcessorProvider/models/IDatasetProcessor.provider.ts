// DTO import
import {
  IDispatchProcessesDTO,
  IDispatchedProcessesDTO,
} from "../types/IDatasetProcessor.dto";

export interface IDatasetProcessorProvider {
  readonly initialization: Promise<void>;

  dispatchNotStartedProcesses(
    params: IDispatchProcessesDTO,
  ): Promise<IDispatchedProcessesDTO>;
}
