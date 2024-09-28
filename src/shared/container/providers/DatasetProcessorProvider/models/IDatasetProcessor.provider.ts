import { File } from "@modules/file/entities/file.entity";
import { Processing } from "@modules/processing/entities/processing.entity";
import { IDispatchProcessDTO } from "../types/IDatasetProcessor.dto";

export interface IDatasetProcessorProvider {
  readonly initialization: Promise<void>;

  dispatchProcess(params: IDispatchProcessDTO): Promise<Processing>;

  handleProcessProgress(): Promise<Processing>;

  generateProcessUploadFile(): Promise<File>;
  handleProcessUploadFile(): Promise<File>;

  handleProcessSuccess(): Promise<Processing>;
  handleProcessFailure(): Promise<Processing>;
}
