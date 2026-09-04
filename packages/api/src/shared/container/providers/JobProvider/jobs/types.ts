import type { IDispatchDatasetProcessingJob } from "./dispatchDatasetProcessingJob";
import type { IProcessingCleanExpiredJob } from "./processingCleanExpiredJob";
import type { IProcessingFailDanglingJob } from "./processingFailDanglingJob";
import type { IRemoveAllDanglingFilesJob } from "./removeAllDanglingFilesJob";
import type { ISendEmailNotificationJob } from "./sendEmailNotificationJob";
import type { IWorkerCleanMissingJob } from "./workerCleanMissingJob";

export type JobTypes = {
  DispatchDatasetProcessingJob: IDispatchDatasetProcessingJob;
  ProcessingCleanExpiredJob: IProcessingCleanExpiredJob;
  ProcessingFailDanglingJob: IProcessingFailDanglingJob;
  RemoveAllDanglingFilesJob: IRemoveAllDanglingFilesJob;
  SendEmailNotificationJob: ISendEmailNotificationJob;
  WorkerCleanMissingJob: IWorkerCleanMissingJob;
};
