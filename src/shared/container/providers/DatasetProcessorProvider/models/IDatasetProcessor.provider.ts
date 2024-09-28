// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

// DTO import
import { IDispatchProcessDTO } from "../types/IDatasetProcessor.dto";

export interface IDatasetProcessorProvider {
  readonly initialization: Promise<void>;

  dispatchProcess(params: IDispatchProcessDTO): Promise<Processing>;
}
