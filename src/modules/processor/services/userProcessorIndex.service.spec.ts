import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { Processor } from "../entities/processor.entity";

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
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    userProcessorIndexService = new UserProcessorIndexService(
      processorRepositoryMock,
    );
  });

  it("should list processors", async () => {
    const processor: Processor = parse(Processor, {
      id: faker.string.uuid(),
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: faker.string.uuid(),
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Partial<Processor>);

    processorRepositoryMock.findMany.mockResolvedValueOnce([processor]);

    const response = await userProcessorIndexService.execute({});

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
