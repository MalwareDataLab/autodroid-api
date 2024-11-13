import type { Systeminformation } from "systeminformation";

// Enum import
import { WORKER_STATUS } from "@modules/worker/utils/workerStatus.enum";

export type ISocketWorkerProcessingJobMessage = {
  processing_id: string;
};

export type ISocketWorkerStatusMessage = {
  status: WORKER_STATUS;
  version: string;
  processing_ids: string[];
  telemetry: Systeminformation.DynamicData;
};
