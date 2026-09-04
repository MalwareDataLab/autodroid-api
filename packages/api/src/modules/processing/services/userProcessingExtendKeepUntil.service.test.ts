import { beforeEach, describe, it, expect, vi } from "vitest";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

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
import { UserProcessingExtendKeepUntilService } from "./userProcessingExtendKeepUntil.service";

describe("Service: UserProcessingExtendKeepUntilService", () => {
  let userProcessingExtendKeepUntilService: UserProcessingExtendKeepUntilService;
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
      { visibility: PROCESSING_VISIBILITY.PUBLIC },
      { associations: { user, dataset, processor } },
    );

    return { user, dataset, processor, processing };
  };

  beforeEach(context => {
    userProcessingExtendKeepUntilService = context.container.resolve(
      UserProcessingExtendKeepUntilService,
    );
    processingRepository = context.container.resolve("ProcessingRepository");
  });

  it("should extend the keep until date", async () => {
    const { user, processing } = await seed();
    const keep_until = DateUtils.now().add(1, "day").toDate();

    const response = await userProcessingExtendKeepUntilService.execute({
      user,
      processing_id: processing.id,
      keep_until,
      language: "en",
    });

    expect(response.keep_until).toEqual(keep_until);
    await expect(
      processingRepository.findOne({ id: processing.id }),
    ).resolves.toMatchObject({ keep_until });
  });

  it("should throw when the processing does not belong to the user", async () => {
    const { processing } = await seed();
    const otherUser = await userFactory.create();

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user: otherUser,
        processing_id: processing.id,
        keep_until: DateUtils.now().add(1, "day").toDate(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/CANNOT_EXTEND_PROCESSING_KEEP_UNTIL",
      }),
    );
  });

  it("should throw when the keep until date is invalid", async () => {
    const { user, processing } = await seed();

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: processing.id,
        keep_until: new Date("invalid"),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/INVALID_KEEP_UNTIL",
      }),
    );
  });

  it("should throw when the keep until date exceeds the allowed range", async () => {
    const { user, processing } = await seed();

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: processing.id,
        keep_until: DateUtils.now().add(60, "days").toDate(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/KEEP_UNTIL_EXCEEDED",
      }),
    );
  });

  it("should throw when the processing was not found after update", async () => {
    const { user, processing } = await seed();

    vi.spyOn(processingRepository, "updateOne").mockResolvedValueOnce(null);

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: processing.id,
        keep_until: DateUtils.now().add(1, "day").toDate(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_processing_extend_keep_until_service/PROCESSING_NOT_FOUND_AFTER_UPDATE",
      }),
    );
  });

  it("should throw when the processing was not found", async () => {
    const { user } = await seed();

    await expect(() =>
      userProcessingExtendKeepUntilService.execute({
        user,
        processing_id: "00000000-0000-0000-0000-000000000000",
        keep_until: DateUtils.now().add(1, "day").toDate(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processing_guard/PROCESSING_NOT_FOUND",
      }),
    );
  });
});
