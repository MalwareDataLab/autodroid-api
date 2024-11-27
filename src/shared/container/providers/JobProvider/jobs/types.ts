import { IDispatchDatasetProcessingJob } from "./dispatchDatasetProcessingJob";
import { IProcessingCleanExpiredJob } from "./processingCleanExpiredJob";
import { IProcessingFailDanglingJob } from "./processingFailDanglingJob";
import { IRemoveAllDanglingFilesJob } from "./removeAllDanglingFilesJob";
import { IWorkerCleanMissingJob } from "./workerCleanMissingJob";

export type JobTypes = {
  DispatchDatasetProcessingJob: IDispatchDatasetProcessingJob;
  ProcessingCleanExpiredJob: IProcessingCleanExpiredJob;
  ProcessingFailDanglingJob: IProcessingFailDanglingJob;
  RemoveAllDanglingFilesJob: IRemoveAllDanglingFilesJob;
  WorkerCleanMissingJob: IWorkerCleanMissingJob;
};
