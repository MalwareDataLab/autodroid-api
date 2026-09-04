import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { faker } from "@faker-js/faker";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Enum import
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Factory import
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Guard import
import { ProcessorGuard } from "./processor.guard";

describe("Guard: ProcessorGuard", () => {
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let processorGuard: ProcessorGuard;

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

    processorGuard = new ProcessorGuard(processorRepositoryMock);
  });

  it("should throw if the processor was not found", async () => {
    processorRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      processorGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        processor_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@processor_guard/PROCESSOR_NOT_FOUND" }),
    );
  });

  it("should return the processor for an admin regardless of visibility", async () => {
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: faker.string.uuid(),
    });
    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    const response = await processorGuard.execute({
      user: { id: faker.string.uuid(), is_admin: true } as User,
      processor_id: processor.id,
      language: "en",
    });

    expect(response.processor).toBe(processor);
    expect(response.t).toBeTypeOf("function");
  });

  it("should return the processor when it is public", async () => {
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      user_id: faker.string.uuid(),
    });
    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    const response = await processorGuard.execute({
      user: { id: faker.string.uuid(), is_admin: false } as User,
      processor_id: processor.id,
      language: "en",
    });

    expect(response.processor).toBe(processor);
  });

  it("should return the processor when the requester is the owner", async () => {
    const user = { id: faker.string.uuid(), is_admin: false } as User;
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: user.id,
    });
    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    const response = await processorGuard.execute({
      user,
      processor_id: processor.id,
      language: "en",
    });

    expect(response.processor).toBe(processor);
  });

  it("should throw if a non-admin requests a private processor they do not own", async () => {
    const processor = processorFactory.build({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: faker.string.uuid(),
    });
    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    await expect(() =>
      processorGuard.execute({
        user: { id: faker.string.uuid(), is_admin: false } as User,
        processor_id: processor.id,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ key: "@processor_guard/PROCESSOR_NOT_PUBLIC" }),
    );
  });
});
