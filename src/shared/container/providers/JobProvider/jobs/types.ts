import { IDispatchDatasetProcessingJob } from "./dispatchDatasetProcessingJob";
import { IProcessingCleanExpiredJob } from "./processingCleanExpiredJob";
import { IRemoveAllDanglingFilesJob } from "./removeAllDanglingFilesJob";

export type JobTypes = {
  DispatchDatasetProcessingJob: IDispatchDatasetProcessingJob;
  ProcessingCleanExpiredJob: IProcessingCleanExpiredJob;
  RemoveAllDanglingFilesJob: IRemoveAllDanglingFilesJob;
};
