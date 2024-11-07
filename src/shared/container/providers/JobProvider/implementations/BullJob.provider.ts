import Bull, { Queue as BullQueue, Job as BullJob } from "bull";
import { container, inject, injectable } from "tsyringe";

// Configuration import
import { getEnvConfig } from "@config/env";

// Interface import
import { IJobProvider, JobType } from "../models/IJob.provider";
import { IJob } from "../models/IJob";

// DTO import
import { IJobOptionsDTO, IQueueOptionsDTO } from "../types/IAddJobOptions.dto";

// Provider import
import {
  IInMemoryDatabaseProvider,
  InMemoryDatabaseProviderAdapter,
} from "../../InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Job import
import * as Jobs from "../jobs";

const bullRedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

type Queue = IJob & {
  queue: BullQueue;
};

@injectable()
class BullJobProvider implements IJobProvider {
  public readonly initialization: Promise<void>;

  private isLoggingEnabled = true;

  private inMemoryDatabaseClient: InMemoryDatabaseProviderAdapter;
  private inMemoryDatabaseSubscriber: InMemoryDatabaseProviderAdapter;

  private modules: Queue[];

  private defaultJobOptions: IJobOptionsDTO = {
    attempts: 10,
    backoff: {
      type: "fixed",
      delay: 30 * 1000,
    },

    removeOnComplete: true,
    removeOnFail: true,
  };

  private queueOptions: IQueueOptionsDTO = {
    lockDuration: 30 * 1000,
    lockRenewTime: 15 * 1000,

    stalledInterval: 30 * 1000,
    maxStalledCount: 0,

    guardInterval: 5 * 1000,

    retryProcessDelay: 5 * 1000,

    backoffStrategies: {},

    drainDelay: 5 * 1000,
  };

  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {
    if (getEnvConfig().JOBS_ENABLED !== "true") {
      this.initialization = Promise.resolve();
      return;
    }

    this.inMemoryDatabaseClient = new this.inMemoryDatabaseProvider.Adapter(
      "jobs_client",
      defaultOptions => ({
        ...defaultOptions,
        ...bullRedisOptions,
      }),
    );
    this.inMemoryDatabaseSubscriber = new this.inMemoryDatabaseProvider.Adapter(
      "jobs_subscriber",
      defaultOptions => ({
        ...defaultOptions,
        ...bullRedisOptions,
      }),
    );
    this.initialization = this.init();
  }

  private log(msg: string) {
    if (this.isLoggingEnabled) console.log(msg);
  }

  private async init() {
    await this.start();

    await this.startCronJobs();

    this.process();

    this.log(
      `🆗 Processing background jobs on ${getEnvConfig().APP_INFO.name || "API"}.`,
    );
  }

  private async startCronJobs() {
    const cronJobs: { name: keyof typeof Jobs; rule: string; data: any }[] = [
      {
        name: "ProcessingCleanExpiredJob",
        rule: "0 0 * * *",
        data: null,
      },
      {
        name: "RemoveAllDanglingFilesJob",
        rule: "0 * * * *",
        data: null,
      },
    ];

    await Promise.all(
      this.modules.map(async ({ queue }) => {
        const repeatableJobs = await queue.getRepeatableJobs();

        if (repeatableJobs?.length) {
          await Promise.all(
            repeatableJobs.map(async existingJob => {
              if (
                !cronJobs.some(
                  allowedCronJob =>
                    allowedCronJob.name === queue.name &&
                    allowedCronJob.rule === existingJob.cron,
                )
              ) {
                await queue.removeRepeatableByKey(existingJob.key);
                console.log("🗑 Removed repeatable job: ", existingJob.key);
              }
            }),
          );
        }
      }),
    );

    cronJobs.forEach(job => {
      this.add(job.name, job.data, {
        repeat: {
          cron: job.rule,
        },
      });
    });
  }

  private async start() {
    await this.inMemoryDatabaseClient.initialization;
    await this.inMemoryDatabaseSubscriber.initialization;

    const jobInstances: IJob[] = Object.values(Jobs).map((job: any) => {
      return container.resolve(job);
    });

    this.modules = Object.values<IJob>(jobInstances).map((job: IJob): Queue => {
      const queueSettings = { ...this.queueOptions, ...job.queueOptions };
      return {
        name: job.name,
        concurrency: job.concurrency,

        jobOptions: job.jobOptions,
        queueOptions: queueSettings,

        handle: job.handle,

        queue: new Bull(job.name, {
          settings: queueSettings,
          createClient: (type, redisOptions) => {
            switch (type) {
              case "client":
                return this.inMemoryDatabaseClient.provider;
              case "subscriber":
                return this.inMemoryDatabaseSubscriber.provider;
              default:
                return new this.inMemoryDatabaseProvider.Adapter(
                  `jobs_bclient_${job.name}`,
                  defaultOptions => ({
                    ...defaultOptions,
                    ...bullRedisOptions,
                    redisOptions,
                  }),
                ).provider;
            }
          },
        }),
      };
    });
  }

  private process() {
    return this.modules.forEach(queue => {
      queue.queue.process(queue.concurrency, async (job: BullJob, done) => {
        await queue.handle(job, done);
      });

      queue.queue.on("error", error => {
        // An error occurred.
        this.log(`❌ Job [${queue.name}] failed! Error: ${error.message}`);
      });

      queue.queue.on("waiting", jobId => {
        // A Job is waiting to be processed as soon as a worker is idling.
        this.log(`⏸  Job [${queue.name}] with id [${jobId}] waiting...`);
      });

      queue.queue.on("active", (job, _) => {
        // A job has started. You can use `jobPromise.cancel()`` to abort it.
        this.log(
          `⏩ Job [${queue.name}] with id [${job.id}] is now on process...`,
        );
      });

      queue.queue.on("stalled", job => {
        // A job has been marked as stalled. This is useful for debugging job
        // workers that crash or pause the event loop.
        this.log(`🆘 Job [${queue.name}] with id [${job.id}] is stalled!`);
      });

      queue.queue.on("lock-extension-failed", (job, err) => {
        // A job failed to extend lock. This will be useful to debug redis
        // connection issues and jobs getting restarted because workers
        // are not able to extend locks.
        this.log(
          `🔒 Job [${queue.name}] with id [${job.id}] lock extension failed! Error: ${err.message}`,
        );
      });

      queue.queue.on("progress", (job, progress) => {
        // A job's progress was updated!
        this.log(
          `🔂 Job [${queue.name}] with id [${job.id}] has updated his progress to ${progress}!`,
        );
      });

      queue.queue.on("completed", (job, result) => {
        // A job successfully completed with a `result`.
        this.log(
          `✅ Job [${queue.name}] with id [${job.id}] has been completed. ${
            result ? `Message: ${result}` : ""
          }`,
        );
      });

      queue.queue.on("failed", (job, err) => {
        // A job failed with reason `err`!
        this.log(
          `❌ Job [${queue.name}] with id [${job.id}] failed! ${
            err.message ? `Message: ${err.message}` : ""
          }`,
        );
      });

      queue.queue.on("paused", () => {
        // The queue has been paused.
        this.log(`⏸ Queue [${queue.name}] has been paused.`);
      });

      queue.queue.on("resumed", () => {
        // The queue has been resumed.
        this.log(`⏯ Queue [${queue.name}] has been resumed.`);
      });

      queue.queue.on("cleaned", () => {
        // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
        // jobs, and `type` is the type of jobs cleaned.
        this.log(`⏯ Queue [${queue.name}] jobs have been cleaned.`);
      });

      queue.queue.on("drained", () => {
        // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
        this.log(`⏸  Queue [${queue.name}] is now drained.`);
      });

      queue.queue.on("removed", job => {
        // A job successfully removed.
        this.log(
          `❎ Job [${queue.name}] with id [${job.id}] was successfully removed.`,
        );
      });
    });
  }

  public add<T extends keyof typeof Jobs>(
    name: T,
    data: JobType<T>,
    options?: IJobOptionsDTO,
  ): void {
    const selectedModule = this.modules.find(queue => queue.name === name);
    if (selectedModule)
      selectedModule.queue.add(data, {
        ...this.defaultJobOptions,
        ...options,
        ...selectedModule.jobOptions,
      });
  }

  public async close(): Promise<void> {
    this.isLoggingEnabled = false;
    await Promise.all(
      this.modules.map(async queue => {
        await queue.queue.pause(true);
        await queue.queue.close();
      }),
    );
    await this.inMemoryDatabaseSubscriber.provider.quit();
    await this.inMemoryDatabaseClient.provider.quit();
  }
}

export { BullJobProvider };
