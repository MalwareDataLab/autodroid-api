// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

export type IDispatchProcessesDTO = {
  processing_ids: string[];
};

export type IDispatchedProcessesDTO = {
  dispatched: Processing[];
  failed: Processing[];
  skipped: Processing[];
};
