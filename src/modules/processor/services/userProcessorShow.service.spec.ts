import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Processor } from "../entities/processor.entity";

// Repository import
import { IProcessorRepository } from "../repositories/IProcessor.repository";

// Service import
import { UserProcessorShowService } from "./userProcessorShow.service";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

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

  it("should get one processor", async () => {
    const processor_id = faker.string.uuid();

    const processor: Processor = parse(Processor, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      updated_at: new Date(),
    } satisfies Partial<Processor>);

    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    const response = await userProcessorShowService.execute({
      user: {
        id: processor.user_id,
      } as User,
      processor_id,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should throw if processor was not found", async () => {
    const processor_id = faker.string.uuid();

    const expected = new AppError({
      key: "@processor_update_service/PROCESSOR_NOT_FOUND",
      message: "Processor not found.",
    });

    processorRepositoryMock.findOne.mockResolvedValueOnce(null);

    expect(() =>
      userProcessorShowService.execute({
        user: {
          id: faker.string.uuid(),
        } as User,
        processor_id,
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });
});
