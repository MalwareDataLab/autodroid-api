import { beforeEach, describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";

// i18n import
import { DEFAULT_LANGUAGE } from "@shared/i18n";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { UserProcessingGetEstimatedExecutionTimeService } from "./userProcessingGetEstimatedExecutionTime.service";

const genDate = () => {
  const finished_at = faker.date.past();
  return {
    started_at: faker.date.past({ refDate: finished_at }),
    finished_at,
  };
};

describe("Service: UserProcessingGetEstimatedExecutionTimeService", () => {
  let userProcessingGetEstimatedExecutionTimeService: UserProcessingGetEstimatedExecutionTimeService;

  const seed = async () => {
    const user = await userFactory.create();
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });

    await Promise.all(
      Array.from({ length: 10 }).map(() => {
        return processingFactory.create(
          {
            ...genDate(),
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
    userProcessingGetEstimatedExecutionTimeService = context.container.resolve(
      UserProcessingGetEstimatedExecutionTimeService,
    );
  });

  it("should be able to get the estimated dataset execution time", async () => {
    const { user, dataset, processor } = await seed();

    const result = await userProcessingGetEstimatedExecutionTimeService.execute(
      {
        user,

        dataset_id: dataset.id,
        processor_id: processor.id,

        language: DEFAULT_LANGUAGE,
      },
    );

    expect(result).toBeDefined();
    expect(result.dataset_id).toBe(dataset.id);
    expect(result.processor_id).toBe(processor.id);
    expect(result.estimated_execution_time).toEqual(expect.any(Number));
    expect(result.estimated_waiting_time).toEqual(expect.any(Number));
    expect(result.estimated_total_time).toBe(
      result.estimated_execution_time! + result.estimated_waiting_time!,
    );
  });

  it("should be able to get the estimated dataset execution time when some processes are running", async () => {
    const { user, dataset, processor } = await seed();

    await processingFactory.create(
      {
        started_at: DateUtils.now().subtract(1, "minute").toDate(),
        finished_at: null,
      },
      {
        associations: {
          dataset,
          processor,
        },
      },
    );

    const result = await userProcessingGetEstimatedExecutionTimeService.execute(
      {
        user,

        dataset_id: dataset.id,
        processor_id: processor.id,

        language: DEFAULT_LANGUAGE,
      },
    );

    expect(result).toBeDefined();
    expect(result.dataset_id).toBe(dataset.id);
    expect(result.processor_id).toBe(processor.id);
    expect(result.estimated_execution_time).toEqual(expect.any(Number));
    expect(result.estimated_waiting_time).toEqual(expect.any(Number));
    expect(result.estimated_waiting_time).toBeGreaterThan(0);
    expect(result.estimated_total_time).toBe(
      result.estimated_execution_time! + result.estimated_waiting_time!,
    );
  });

  it("should return null when dataset or processor was not found", async () => {
    const { user } = await seed();

    await expect(
      userProcessingGetEstimatedExecutionTimeService.execute({
        user,

        dataset_id: faker.string.uuid(),
        processor_id: faker.string.uuid(),

        language: DEFAULT_LANGUAGE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ message: "Processor not found." }),
    );
  });
});
