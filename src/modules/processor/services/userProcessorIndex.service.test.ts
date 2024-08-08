import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { container } from "tsyringe";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import {
  IUserRepository,
  IProcessorRepository,
} from "@shared/container/repositories";

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

    const userRepository = container.resolve<IUserRepository>("UserRepository");
    user = await userRepository.createOne({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      language: "en",
      phone_number: null,
    });

    userProcessorIndexService = new UserProcessorIndexService(
      processorRepository,
    );
  });

  it("should list processors", async () => {
    const processor = await processorRepository.createOne({
      description: faker.word.words(3),
      tags: "one,two,three",
      user_id: user.id,
      visibility: PROCESSOR_VISIBILITY.PUBLIC,
      name: faker.word.words(3),
      allowed_mime_types: faker.system.mimeType(),
      image_tag: faker.system.fileName(),
      payload: {},
      version: faker.system.semver(),
    });

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
