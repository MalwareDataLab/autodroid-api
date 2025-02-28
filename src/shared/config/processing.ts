// Configuration import
import { getMillisecondConfig } from "./millisecond";

const getProcessingConfig = () => {
  const msConfig = getMillisecondConfig();

  return {
    PROCESSING_DEFAULT_KEEP_UNTIL_MS: msConfig.PROCESSING_DEFAULT_KEEP_UNTIL,
    PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND_MS:
      msConfig.PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND,
    ESTIMATED_MINIMUM_WORKER_ACQUISITION_TIME_SECONDS: 60,
  };
};

export { getProcessingConfig };
