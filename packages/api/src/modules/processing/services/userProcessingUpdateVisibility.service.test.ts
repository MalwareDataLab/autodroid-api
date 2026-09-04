import { beforeEach, describe, it, expect, vi } from "vitest";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

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
import { UserProcessingUpdateVisibilityService } from "./userProcessingUpdateVisibility.service";

describe("Service: UserProcessingUpdateVisibilityService", () => {
  let userProcessingUpdateVisibilityService: UserProcessingUpdateVisibilityService;
  let processingRepository: IProcessingRepository;

  const seed = async () => {
    const user = await userFactory.create();
    const dataset = await datasetFactory.create({
      visibility: DATASET_VISIBILITY.PUBLIC,
    });
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
    });
    const processing = await processingFactory.create(
      { visibility: PROCESSING_VISIBILITY.PRIVATE },
      { associations: { user, dataset, processor } },
    );

    return { user, dataset, processor, processing };
  };

  beforeEach(context => {
    userProcessingUpdateVisibilityService = context.container.resolve(
      UserProcessingUpdateVisibilityService,
    );
    processingRepository = context.container.resolve("ProcessingRepository");
  });

  it("should update the processing visibility", async () => {
    const { user, processing } = await seed();

    const response = await userProcessingUpdateVisibilityService.execute({
      user,
      processing_id: processing.id,
      visibility: PROCESSING_VISIBILITY.PUBLIC,
      language: "en",
    });

    expect(response.visibility).toBe(PROCESSING_VISIBILITY.PUBLIC);
    await expect(
      processingRepository.findOne({ id: processing.id }),
    ).resolves.toMatchObject({ visibility: PROCESSING_VISIBILITY.PUBLIC });
  });

  it("should throw when the processing does not belong to the user", async () => {
    const { processing: seededProcessing } = await seed();
    const processing = (await processingRepository.updateOne(
      { id: seededProcessing.id },
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
    ))!;
    const otherUser = await userFactory.create();

    await expect(() =>
      userProcessingUpdateVisibilityService.execute({
        user: otherUser,
        processing_id: processing.id,
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_update_visibility_service/CANNOT_UPDATE_PROCESSING_VISIBILITY",
      }),
    );
  });

  it("should throw when the processing was not found after update", async () => {
    const { user, processing } = await seed();

    vi.spyOn(processingRepository, "updateOne").mockResolvedValueOnce(null);

    await expect(() =>
      userProcessingUpdateVisibilityService.execute({
        user,
        processing_id: processing.id,
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_update_visibility_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
      }),
    );
  });

  it("should throw when the processing was not found", async () => {
    const { user } = await seed();

    await expect(() =>
      userProcessingUpdateVisibilityService.execute({
        user,
        processing_id: "00000000-0000-0000-0000-000000000000",
        visibility: PROCESSING_VISIBILITY.PUBLIC,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSING_NOT_FOUND",
      }),
    );
  });
});
