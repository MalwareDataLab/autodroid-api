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

// Schema import
import { ProcessingIndexSchema } from "../schemas/processingIndex.schema";

// Target import
import { UserProcessingIndexService } from "./userProcessingIndex.service";

describe("Service: UserProcessingIndexService", () => {
  let userProcessingIndexService: UserProcessingIndexService;

  beforeEach(context => {
    userProcessingIndexService = context.container.resolve(
      UserProcessingIndexService,
    );
  });

  it("should return a paginated list scoped to the dataset and processor", async () => {
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
    await processingFactory.create({
      visibility: PROCESSING_VISIBILITY.PUBLIC,
    });

    const params = {
      dataset_id: dataset.id,
      processor_id: processor.id,
    } as ProcessingIndexSchema;

    const response = await userProcessingIndexService.execute({
      user,
      params,
      language: "en",
    });

    expect(response.totalCount).toBe(1);
    expect(response.edges).toHaveLength(1);
    expect(response.edges[0].node.id).toBe(processing.id);
  });

  it("should not return another user's private processing", async () => {
    const user = await userFactory.create();
    const otherUser = await userFactory.create();

    await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user: otherUser } },
    );
    const ownProcessing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user } },
    );

    const response = await userProcessingIndexService.execute({
      user,
      params: {} as ProcessingIndexSchema,
      language: "en",
    });

    expect(response.edges).toHaveLength(1);
    expect(response.edges[0].node.id).toBe(ownProcessing.id);
  });

  it("should throw when the dataset filter does not exist", async () => {
    const user = await userFactory.create();

    await expect(() =>
      userProcessingIndexService.execute({
        user,
        params: {
          dataset_id: faker.string.uuid(),
        } as ProcessingIndexSchema,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@processing_guard/DATASET_NOT_FOUND" }),
    );
  });
});
