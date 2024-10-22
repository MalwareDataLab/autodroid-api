import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { IProcessorRepository } from "../repositories/IProcessor.repository";

// Service import
import { UserProcessorShowService } from "./userProcessorShow.service";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

// Factory import
import { processorFactory } from "../entities/factories/processor.factory";

describe("Service: UserProcessorShowService", () => {
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let userProcessorShowService: UserProcessorShowService;

  beforeEach(() => {
    processorRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getAllowedMimeTypes: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    userProcessorShowService = new UserProcessorShowService(
      processorRepositoryMock,
    );
  });

  it("should get one processor when is public", async () => {
    const user = userFactory.build();

    const processor = processorFactory.build(
      {
        description: faker.word.words(3),
        tags: "one,two,three",
        visibility: PROCESSOR_VISIBILITY.PUBLIC,
      },
      {
        associations: { user },
        transient: { withRelations: true },
      },
    );

    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    const response = await userProcessorShowService.execute({
      processor_id: processor.id,

      user: processor.user,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should get one processor when is hidden but the user is the owner", async () => {
    const user = userFactory.build();

    const processor = processorFactory.build(
      {
        description: faker.word.words(3),
        tags: "one,two,three",
        visibility: PROCESSOR_VISIBILITY.HIDDEN,
      },
      {
        associations: { user },
        transient: { withRelations: true },
      },
    );

    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    const response = await userProcessorShowService.execute({
      processor_id: processor.id,

      user,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should return not found if the processor is not public and user is not an admin", async () => {
    const createdUser = userFactory.build();
    const user = userFactory.build({ is_admin: false });

    const processor = processorFactory.build(
      {
        id: faker.string.uuid(),
        description: faker.word.words(3),
        tags: "one,two,three",
        visibility: PROCESSOR_VISIBILITY.HIDDEN,
      },
      {
        associations: { user: createdUser },
        transient: { withRelations: true },
      },
    );

    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    expect(() =>
      userProcessorShowService.execute({
        user,
        processor_id: processor.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processor_guard/PROCESSOR_NOT_PUBLIC",
      }),
    );
  });

  it("should throw if processor was not found", async () => {
    const user = userFactory.build({ is_admin: false });

    processorRepositoryMock.findOne.mockResolvedValueOnce(null);

    expect(() =>
      userProcessorShowService.execute({
        user,
        processor_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@processor_guard/PROCESSOR_NOT_FOUND",
      }),
    );
  });
});
