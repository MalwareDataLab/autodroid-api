import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Factory import
import { processorFactory } from "../entities/factories/processor.factory";

// Repository import
import { IProcessorRepository } from "../repositories/IProcessor.repository";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

// Service import
import { UserProcessorIndexService } from "./userProcessorIndex.service";

describe("Service: UserProcessorIndexService", () => {
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let userProcessorIndexService: UserProcessorIndexService;

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

    userProcessorIndexService = new UserProcessorIndexService(
      processorRepositoryMock,
    );
  });

  it("should list processors", async () => {
    const processor = processorFactory.build(
      {
        description: faker.word.words(3),
        tags: "one,two,three",
        visibility: PROCESSOR_VISIBILITY.PUBLIC,
      },
      { transient: { withRelations: true } },
    );

    processorRepositoryMock.findManyPublicOrUserPrivate.mockResolvedValueOnce([
      processor,
    ]);

    const response = await userProcessorIndexService.execute({
      user: processor.user,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(processor),
          }),
        ]),
      }),
    );
  });
});
