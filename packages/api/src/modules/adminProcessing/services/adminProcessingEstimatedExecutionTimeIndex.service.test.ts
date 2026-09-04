import { beforeEach, describe, it, expect, vi } from "vitest";
import { faker } from "@faker-js/faker";

// i18n import
import { DEFAULT_LANGUAGE } from "@shared/i18n";

// Config import
import { getAdminConfig } from "@config/admin";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Target import
import { AdminProcessingEstimatedExecutionTimeIndexService } from "./adminProcessingEstimatedExecutionTimeIndex.service";

const genDate = () => {
  const finished_at = faker.date.past();
  return {
    started_at: faker.date.past({ refDate: finished_at }),
    finished_at,
  };
};

describe("Service: AdminProcessingShowService", () => {
  let adminProcessingShowService: AdminProcessingEstimatedExecutionTimeIndexService;

  const seed = async (
    {
      withProcesses,
    }: {
      withProcesses: boolean;
    } = {
      withProcesses: true,
    },
  ) => {
    const user = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    if (withProcesses)
      await Promise.all(
        Array.from({ length: 10 }).map(() => {
          return processingFactory.create(
            {
              ...genDate(),
              status: PROCESSING_STATUS.SUCCEEDED,
            },
            {
              associations: {
                dataset,
                processor,
              },
            },
          );
        }),
      );

    return {
      user,
      dataset,
      processor,
    };
  };

  beforeEach(context => {
    adminProcessingShowService = context.container.resolve(
      AdminProcessingEstimatedExecutionTimeIndexService,
    );
  });

  it("should be able to get the estimated execution times", async () => {
    const { user, dataset, processor } = await seed();

    const result = await adminProcessingShowService.execute({
      user,
      filter: {},
      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);

    expect(result[0]).toBeDefined();
    expect(result[0]?.dataset_id).toBe(dataset.id);
    expect(result[0]?.processor_id).toBe(processor.id);
    expect(result[0]?.estimated_execution_time).toEqual(expect.any(Number));
    expect(result[0]?.estimated_waiting_time).toBe(null);
  });

  it("should be able to get the estimated execution times with empty results", async () => {
    const { user } = await seed({ withProcesses: false });

    const result = await adminProcessingShowService.execute({
      user,
      filter: {},
      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it("should be able to get the estimated execution times with filter", async () => {
    const { user, dataset, processor } = await seed();

    const result = await adminProcessingShowService.execute({
      user,
      filter: {
        dataset_id: dataset.id,
        processor_id: processor.id,
      },
      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);

    expect(result[0]?.dataset_id).toBe(dataset.id);
    expect(result[0]?.processor_id).toBe(processor.id);
    expect(result[0]?.estimated_execution_time).toEqual(expect.any(Number));
    expect(result[0]?.estimated_waiting_time).toBe(null);
  });

  it("should be able to get the estimated execution times with running processes", async () => {
    const { user, dataset, processor } = await seed();

    await processingFactory.create(
      {
        started_at: DateUtils.now().subtract(1, "minute").toDate(),
        finished_at: null,
        status: PROCESSING_STATUS.RUNNING,
      },
      {
        associations: {
          dataset,
          processor,
        },
      },
    );

    const result = await adminProcessingShowService.execute({
      user,
      filter: {},
      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]).toBeDefined();
    expect(result[0]?.estimated_execution_time).toBeGreaterThan(0);
    expect(result[0]?.estimated_waiting_time).toBeGreaterThan(0);
  });

  it("should be able to get the estimated execution times with predefined processes", async () => {
    const { user, dataset, processor } = await seed({ withProcesses: false });

    await processingFactory.create(
      {
        started_at: new Date("2023-01-01T00:00:00.000Z"),
        finished_at: new Date("2023-01-01T00:00:10.000Z"),
        status: PROCESSING_STATUS.SUCCEEDED,
      },
      {
        associations: {
          dataset,
          processor,
        },
      },
    );

    await processingFactory.create(
      {
        started_at: new Date("2023-01-01T00:00:00.000Z"),
        finished_at: new Date("2023-01-01T00:00:20.000Z"),
        status: PROCESSING_STATUS.SUCCEEDED,
      },
      {
        associations: {
          dataset,
          processor,
        },
      },
    );

    await processingFactory.create(
      {
        started_at: new Date("2023-01-01T00:00:25.000Z"),
        finished_at: null,
        status: PROCESSING_STATUS.RUNNING,
      },
      {
        associations: {
          dataset,
          processor,
        },
      },
    );

    vi.useFakeTimers({ now: new Date("2023-01-01T00:00:30.000Z") });

    const result = await adminProcessingShowService.execute({
      user,
      filter: {},
      language: DEFAULT_LANGUAGE,
    });

    vi.useRealTimers();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]).toBeDefined();
    expect(result[0]?.estimated_execution_time).toBe(15);
    expect(result[0]?.estimated_waiting_time).toBeGreaterThan(0);
  });

  it("should handle processes without start time", async () => {
    const { user, dataset, processor } = await seed();

    await processingFactory.create(
      {
        started_at: null,
        finished_at: null,
        status: PROCESSING_STATUS.PENDING,
      },
      {
        associations: {
          dataset,
          processor,
        },
      },
    );

    const result = await adminProcessingShowService.execute({
      user,
      filter: {},
      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    const estimation = result.find(
      est => est.dataset_id === dataset.id && est.processor_id === processor.id,
    );
    expect(estimation).toBeDefined();
    expect(estimation?.estimated_waiting_time).toBeGreaterThan(0);
  });
});
