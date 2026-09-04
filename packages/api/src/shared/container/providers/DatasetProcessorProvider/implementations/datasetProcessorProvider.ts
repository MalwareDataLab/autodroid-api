import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Config import
import { getWorkerConfig } from "@config/worker";

// Repository import
import {
  IProcessingRepository,
  IWorkerRepository,
} from "@shared/container/repositories";

// Util import
import { logger } from "@shared/utils/logger";
import { validateProcessor } from "@modules/processor/utils/validateProcessor.util";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Worker } from "@modules/worker/entities/worker.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import { IWebsocketProvider } from "@shared/container/providers/WebsocketProvider/models/IWebsocket.provider";

// Type import
import { ISocketWorkerStatusMessage } from "@shared/infrastructure/websocket/socket.types";
import {
  IDispatchProcessesDTO,
  IDispatchedProcessesDTO,
} from "../types/IDatasetProcessor.dto";

// Interface import
import { IDatasetProcessorProvider } from "../models/IDatasetProcessor.provider";

@injectable()
class DatasetProcessorProvider implements IDatasetProcessorProvider {
  public readonly initialization: Promise<void>;

  private readonly workerJobsKey = "worker:JOBS";
  private readonly maxConcurrentJobs: number;

  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,

    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("WebsocketProvider")
    public websocketProvider: IWebsocketProvider,
  ) {
    this.maxConcurrentJobs = getWorkerConfig().worker_max_concurrent_jobs;
    this.initialization = this.init();
  }

  private async init(): Promise<void> {
    await this.websocketProvider.initialization;
    await this.inMemoryDatabaseProvider.initialization;

    this.websocketProvider.on("worker:status", ({ worker_id, ...data }) => {
      this.handleWorkerStatus({
        worker_id,
        data,
      });

      /*
      TODO: Store telemetry

      console.log("RAM", JSON.stringify(data.telemetry.mem, null, 2));
      console.log(
        "CPU",
        JSON.stringify(data.telemetry.cpuCurrentSpeed, null, 2),
      );
      console.log("LOAD", JSON.stringify(data.telemetry.currentLoad, null, 2));
      console.log("DISK IO", JSON.stringify(data.telemetry.disksIO, null, 2));
      console.log("FS SIZE", JSON.stringify(data.telemetry.fsSize, null, 2));
      console.log("FS STATS", JSON.stringify(data.telemetry.fsStats, null, 2));

      // Extract critical system metrics for research analysis
      const telemetryVersion = "v1";
      const criticalMetrics = [
        `version:${telemetryVersion}`,
        `timestamp:${data.telemetry.time.current}`,
        `cpu_usage:${data.telemetry.currentLoad?.currentLoad?.toFixed(2) || "N/A"}`,
        `cpu_speed:${data.telemetry.cpuCurrentSpeed?.avg?.toFixed(2) || "N/A"}`,
        `ram_used_percent:${data.telemetry.mem?.used && data.telemetry.mem?.total ? ((data.telemetry.mem.used / data.telemetry.mem.total) * 100).toFixed(2) : "N/A"}`,
        `ram_free:${data.telemetry.mem?.free ? (data.telemetry.mem.free / (1024 * 1024 * 1024)).toFixed(2) : "N/A"}`,
      ].join(",");

      // Additional metrics when processing is active
      if (data.processing_ids.length > 0) {
        const diskMetrics = [
          `disk_io_read:${data.telemetry.disksIO?.rIO || "N/A"}`,
          `disk_io_write:${data.telemetry.disksIO?.wIO || "N/A"}`,
          `disk_usage:${Array.isArray(data.telemetry.fsSize) ? data.telemetry.fsSize[0]?.use : "N/A"}`,
          `network_rx_bytes:${data.telemetry.networkStats?.[0]?.rx_bytes || "N/A"}`,
          `network_tx_bytes:${data.telemetry.networkStats?.[0]?.tx_bytes || "N/A"}`,
          `cpu_temp:${(data.telemetry as any)?.temp?.main || "N/A"}`,
          `latency:${data.telemetry.inetLatency || "N/A"}`,
        ].join(",");

        console.log(`Worker telemetry data: ${criticalMetrics},${diskMetrics}`);
      } else {
        console.log(`Worker telemetry data: ${criticalMetrics}`);
      }


      const selectedData = {
        time: data.telemetry.time,
        cpuCurrentSpeed: data.telemetry.cpuCurrentSpeed,
        currentLoad: data.telemetry.currentLoad,
        mem: data.telemetry.mem,

        ...(data.processing_ids.length && {
          disksIO: data.telemetry.disksIO,
          fsSize: data.telemetry.fsSize,
          fsStats: data.telemetry.fsStats,
          networkStats: data.telemetry.networkStats,
          temp: (data.telemetry as any).temp!,
          inetLatency: data.telemetry.inetLatency,
        }),
      };

      // Calculate the size of the telemetry data in KB
      const jsonString = JSON.stringify(selectedData);
      const sizeInBytes = Buffer.byteLength(jsonString, "utf8");
      const sizeInKB = sizeInBytes / 1024;
      console.log(`Telemetry data size: ${sizeInKB.toFixed(2)}KB`);
      */
    });
  }

  private async handleWorkerStatus({
    worker_id,
    data,
  }: {
    worker_id: string;
    data: ISocketWorkerStatusMessage;
  }): Promise<void> {
    const worker = await this.workerRepository.findOne({ id: worker_id });

    if (!worker) {
      await this.inMemoryDatabaseProvider.connection.hdel(
        this.workerJobsKey,
        worker_id,
      );

      throw new AppError({
        key: "@dataset_processor_provider_handle_worker_status/WORKER_NOT_FOUND",
        message: "Worker not found.",
      });
    }

    await this.inMemoryDatabaseProvider.connection.hset(
      this.workerJobsKey,
      worker_id,
      data.processing_ids.length.toString(),
    );

    await this.workerRepository.updateOne(
      { id: worker.id },
      {
        name: data.name,
        version: data.version,
        last_seen_at: new Date(),
        missing: false,
      },
    );
  }

  private async getWorkerById(worker_id: string): Promise<Worker> {
    const worker = await this.workerRepository.findOne({
      id: worker_id,
      missing: false,
    });

    if (!worker) {
      await this.inMemoryDatabaseProvider.connection.hdel(
        this.workerJobsKey,
        worker_id,
      );

      throw new AppError({
        key: "@dataset_processor_provider_get_worker_by_id/WORKER_NOT_FOUND",
        message: "Worker not found.",
      });
    }

    try {
      await this.websocketProvider.sendMessageToRoom(
        `worker:${worker.id}`,
        "worker:get-status",
      );

      await new Promise((resolve, reject) => {
        let timeout: NodeJS.Timeout;

        const listener = async (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        };

        timeout = setTimeout(() => {
          this.websocketProvider.off(`worker:${worker.id}:status`, listener);
          reject(
            new AppError({
              key: "@dataset_processor_provider_get_worker_by_id/WORKER_TIMEOUT",
              message: "Worker timeout.",
            }),
          );
        }, 5000);

        this.websocketProvider.once(`worker:${worker.id}:status`, listener);
      });

      return worker;
    } catch (error) {
      await this.inMemoryDatabaseProvider.connection.hdel(
        this.workerJobsKey,
        worker.id,
      );

      if (AppError.isInstance(error)) throw error;

      throw new AppError({
        key: "@dataset_processor_provider_get_worker_by_id/WORKER_NOT_AVAILABLE",
        message: "Worker not available.",
      });
    }
  }

  private async getWorkerJobCounts(): Promise<Record<string, number>> {
    const workersJobs =
      (await this.inMemoryDatabaseProvider.connection.hgetall(
        this.workerJobsKey,
      )) || {};

    const result: Record<string, number> = {};

    Object.keys(workersJobs).forEach(workerId => {
      result[workerId] = parseInt(workersJobs[workerId], 10) || 0;
    });

    return result;
  }

  private async dispatchProcessToWorker(params: {
    worker_id: string;
    processing_id: string;
  }): Promise<Processing> {
    const { processing_id } = params;
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    const worker = await this.getWorkerById(params.worker_id);

    if (!processing)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
      });

    if (processing.started_at)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_ALREADY_STARTED",
        message: "Processing already started.",
      });

    if (!processing.dataset.file)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/FILE_NOT_FOUND",
        message: "Dataset file not found.",
      });

    await validateProcessor(processing.processor);

    try {
      const file = await File.process(processing.dataset.file);

      if (
        !file.public_url ||
        file.provider_status !== FILE_PROVIDER_STATUS.READY
      )
        throw new AppError({
          key: "@dataset_processor_provider_dispatch_process/DATASET_NOT_AVAILABLE",
          message: "Dataset not available.",
        });

      const acquisition = new Promise((resolve, reject) => {
        let timeout: NodeJS.Timeout;

        const listener = async (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        };

        timeout = setTimeout(() => {
          this.websocketProvider.off(
            `worker:${worker.id}:processing:${processing_id}:acquired`,
            listener,
          );
          reject(
            new AppError({
              key: "@dataset_processor_provider_dispatch_process/PROCESSING_NOT_ACQUIRED",
              message: "Worker has not responded with processing acquired.",
            }),
          );
        }, 30000);

        this.websocketProvider.once(
          `worker:${worker.id}:processing:${processing_id}:acquired`,
          listener,
        );
      });

      await this.websocketProvider.sendMessageToRoom(
        `worker:${worker.id}`,
        "worker:work",
        { processing_id },
      );

      await acquisition;

      const load = await this.inMemoryDatabaseProvider.connection.hincrby(
        this.workerJobsKey,
        worker.id,
        1,
      );

      const updatedProcessing = await this.processingRepository.updateOne(
        { id: processing.id },
        { worker_id: worker.id },
      );

      logger.info(
        `💥 Dispatched processing ID ${processing.id} to worker ${worker.name || worker.id}. Current worker load: ${load}.`,
      );

      return updatedProcessing;
    } catch (error: any) {
      const isAppError = AppError.isInstance(error);
      await this.processingRepository
        .updateOne(
          { id: processing.id },
          {
            attempts: processing.attempts || 0 + 1,
            message: isAppError ? error.message : "An error occurred.",
          },
        )
        .catch(() => null);

      if (isAppError) throw error;
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/PROCESSING_DISPATCH_ERROR",
        message: error.message,
        debug: { error },
      });
    }
  }

  public async dispatchNotStartedProcesses(
    _: IDispatchProcessesDTO,
  ): Promise<IDispatchedProcessesDTO> {
    const processes = await this.processingRepository.findMany(
      {
        worker_id: null,
      },
      { skip: 0 },
      [{ field: "created_at", order: SORT_ORDER.ASC }],
    );

    if (processes.length === 0) {
      logger.info("🆗 No processes to dispatch.");
      return { dispatched: [], failed: [], skipped: [] };
    }

    const workerJobCounts = await this.getWorkerJobCounts();
    const workerIds = Object.keys(workerJobCounts);

    if (workerIds.length === 0)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/NO_WORKER_AVAILABLE",
        message: "No worker available.",
      });

    const availableWorkerCounts = workerIds.reduce<Record<string, number>>(
      (acc, workerId) => {
        if (workerJobCounts[workerId] < this.maxConcurrentJobs) {
          acc[workerId] = workerJobCounts[workerId];
        }
        return acc;
      },
      {},
    );

    const totalAvailableSlots = Object.values(availableWorkerCounts).reduce(
      (acc, count) => acc + (this.maxConcurrentJobs - count),
      0,
    );

    if (totalAvailableSlots === 0)
      throw new AppError({
        key: "@dataset_processor_provider_dispatch_process/ALL_WORKERS_BUSY",
        message: "All workers are busy.",
      });

    const successfullyDispatched: Processing[] = [];
    const failedToDispatch: Processing[] = [];

    await Promise.all(
      Array.from({ length: totalAvailableSlots }, async () => {
        const processing = processes.shift();
        if (!processing) return;

        const selectedWorkerId = Object.keys(availableWorkerCounts)
          .sort((a, b) => availableWorkerCounts[a] - availableWorkerCounts[b])
          .find(
            workerId =>
              availableWorkerCounts[workerId] < this.maxConcurrentJobs,
          );
        if (!selectedWorkerId) return;

        availableWorkerCounts[selectedWorkerId] =
          (availableWorkerCounts[selectedWorkerId] || 0) + 1;

        try {
          await this.dispatchProcessToWorker({
            processing_id: processing.id,
            worker_id: selectedWorkerId,
          });

          successfullyDispatched.push(processing);
        } catch (error) {
          if (AppError.isInstance(error)) {
            logger.error(
              `❎ Cannot dispatch processing ID ${processing?.id} to worker ${selectedWorkerId}. ${error.message}`,
            );
            failedToDispatch.push(processes[0]);
          } else {
            throw error;
          }
        }
      }),
    );

    return {
      dispatched: successfullyDispatched,
      failed: failedToDispatch,
      skipped: processes,
    };
  }
}

export { DatasetProcessorProvider };
