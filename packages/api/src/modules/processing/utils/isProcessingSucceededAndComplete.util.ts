// Entity import
import { Processing } from "../entities/processing.entity";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

const isProcessingSucceededAndComplete = (processing: Processing) => {
  return (
    !!processing &&
    processing.status === PROCESSING_STATUS.SUCCEEDED &&
    !!processing.metrics_file?.public_url &&
    !!processing.result_file?.public_url
  );
};

export { isProcessingSucceededAndComplete };
