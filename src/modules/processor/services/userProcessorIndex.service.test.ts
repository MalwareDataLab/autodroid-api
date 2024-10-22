import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "../entities/factories/processor.factory";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

// Service import
import { UserProcessorIndexService } from "./userProcessorIndex.service";

describe("Service: UserProcessorIndexService", () => {
  let user: User;
  let processorRepository: IProcessorRepository;

  let userProcessorIndexService: UserProcessorIndexService;

  beforeEach(async () => {
    processorRepository = container.resolve("ProcessorRepository");

    user = await userFactory.create();

    userProcessorIndexService = new UserProcessorIndexService(
      processorRepository,
    );
  });

  it("should list public processors", async () => {
    const adminUser = await userFactory.create();
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      user_id: adminUser.id,
    });

    const response = await userProcessorIndexService.execute({
      user,
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

  it("should list hidden processors owned by current user", async () => {
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: user.id,
    });

    const response = await userProcessorIndexService.execute({
      user,
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

  it("should not list hidden processors when not admin and processor is not owned by current user", async () => {
    const adminUser = await userFactory.create();
    const processor = await processorFactory.create({
      visibility: PROCESSOR_VISIBILITY.HIDDEN,
      user_id: adminUser.id,
    });

    const response = await userProcessorIndexService.execute({
      user,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.not.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(processor),
          }),
        ]),
      }),
    );
  });
});
