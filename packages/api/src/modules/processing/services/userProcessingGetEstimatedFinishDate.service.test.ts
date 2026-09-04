import { beforeEach, describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";

// i18n import
import { DEFAULT_LANGUAGE } from "@shared/i18n";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { UserProcessingGetEstimatedFinishDateService } from "./userProcessingGetEstimatedFinishDate.service";

const genDate = () => {
  const finished_at = faker.date.past();
  return {
    started_at: faker.date.past({ refDate: finished_at }),
    finished_at,
  };
};

describe("Service: UserProcessingGetEstimatedFinishDateService", () => {
  let userProcessingGetEstimatedFinishDateService: UserProcessingGetEstimatedFinishDateService;

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
    userProcessingGetEstimatedFinishDateService = context.container.resolve(
      UserProcessingGetEstimatedFinishDateService,
    );
  });

  it("should be able to get the estimated dataset time when not started", async () => {
    const { user, dataset, processor } = await seed();

    const processing = await processingFactory.create(
      { started_at: null, finished_at: null },
      {
        associations: {
          dataset,
          processor,
          user,
        },
      },
    );

    const result = await userProcessingGetEstimatedFinishDateService.execute({
      user,

      processing_id: processing.id,

      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result.dataset_id).toBe(dataset.id);
    expect(result.processor_id).toBe(processor.id);
    expect(result.estimated_start_time).toBeInstanceOf(Date);
    expect(result.estimated_finish_time).toBeInstanceOf(Date);
    expect(result.estimated_finish_time!.getTime()).toBeGreaterThan(
      result.estimated_start_time!.getTime(),
    );
  });

  it("should be able to get the estimated dataset time when not started and some processes are running", async () => {
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

    const processing = await processingFactory.create(
      { started_at: null, finished_at: null },
      {
        associations: {
          dataset,
          processor,
          user,
        },
      },
    );

    const result = await userProcessingGetEstimatedFinishDateService.execute({
      user,

      processing_id: processing.id,

      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result.dataset_id).toBe(dataset.id);
    expect(result.processor_id).toBe(processor.id);
    expect(result.estimated_start_time).toBeInstanceOf(Date);
    expect(result.estimated_finish_time).toBeInstanceOf(Date);
    expect(result.estimated_finish_time!.getTime()).toBeGreaterThan(
      result.estimated_start_time!.getTime(),
    );
  });

  it("should be able to get the estimated dataset time when started", async () => {
    const { user, dataset, processor } = await seed();

    const processing = await processingFactory.create(
      { started_at: faker.date.past(), finished_at: null },
      {
        associations: {
          dataset,
          processor,
          user,
        },
      },
    );

    const result = await userProcessingGetEstimatedFinishDateService.execute({
      user,

      processing_id: processing.id,

      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result.dataset_id).toBe(dataset.id);
    expect(result.processor_id).toBe(processor.id);
    expect(result.estimated_start_time).toEqual(processing.started_at);
    expect(result.estimated_finish_time).toBeInstanceOf(Date);
    expect(result.estimated_finish_time!.getTime()).toBeGreaterThan(
      result.estimated_start_time!.getTime(),
    );
  });

  it("should be able to get the estimated dataset time when finished", async () => {
    const { user, dataset, processor } = await seed();

    const processing = await processingFactory.create(
      { ...genDate() },
      {
        associations: {
          dataset,
          processor,
          user,
        },
      },
    );

    const result = await userProcessingGetEstimatedFinishDateService.execute({
      user,

      processing_id: processing.id,

      language: DEFAULT_LANGUAGE,
    });

    expect(result).toBeDefined();
    expect(result.dataset_id).toBe(dataset.id);
    expect(result.processor_id).toBe(processor.id);
    expect(result.estimated_start_time).toEqual(processing.started_at);
    expect(result.estimated_finish_time).toEqual(processing.finished_at);
    expect(result.estimated_finish_time!.getTime()).toBeGreaterThan(
      result.estimated_start_time!.getTime(),
    );
  });

  it("should return null when processing was not found", async () => {
    const { user } = await seed();

    await expect(
      userProcessingGetEstimatedFinishDateService.execute({
        user,

        processing_id: faker.string.uuid(),

        language: DEFAULT_LANGUAGE,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ message: "Processing not found." }),
    );
  });
});
