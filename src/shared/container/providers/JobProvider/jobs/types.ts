import { IDispatchDatasetProcessingJob } from "./dispatchDatasetProcessingJob";
import { IProcessingCleanExpiredJob } from "./processingCleanExpiredJob";
import { IRemoveAllDanglingFilesJob } from "./removeAllDanglingFilesJob";
import { IWorkerCleanMissingJob } from "./workerCleanMissingJob";

export type JobTypes = {
  DispatchDatasetProcessingJob: IDispatchDatasetProcessingJob;
  ProcessingCleanExpiredJob: IProcessingCleanExpiredJob;
  RemoveAllDanglingFilesJob: IRemoveAllDanglingFilesJob;
  WorkerCleanMissingJob: IWorkerCleanMissingJob;
};
