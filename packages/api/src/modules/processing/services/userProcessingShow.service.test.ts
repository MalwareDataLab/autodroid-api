import { beforeEach, describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { processingFactory } from "../entities/factories/processing.factory";

// Target import
import { UserProcessingShowService } from "./userProcessingShow.service";

describe("Service: UserProcessingShowService", () => {
  let userProcessingShowService: UserProcessingShowService;

  beforeEach(context => {
    userProcessingShowService = context.container.resolve(
      UserProcessingShowService,
    );
  });

  it("should return the processing", async () => {
    const user = await userFactory.create();
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
      { associations: { user, dataset, processor } },
    );

    const response = await userProcessingShowService.execute({
      user,
      processing_id: processing.id,
      language: "en",
    });

    expect(response.id).toBe(processing.id);
  });

  it("should throw when the processing was not found", async () => {
    const user = await userFactory.create();

    await expect(() =>
      userProcessingShowService.execute({
        user,
        processing_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSING_NOT_FOUND",
      }),
    );
  });

  it("should throw when the processing is private and belongs to another user", async () => {
    const user = await userFactory.create();
    const owner = await userFactory.create();
    const processing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user: owner } },
    );

    await expect(() =>
      userProcessingShowService.execute({
        user,
        processing_id: processing.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSOR_NOT_PUBLIC",
      }),
    );
  });
});
