import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { container } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import {
  IUserRepository,
  IProcessorRepository,
} from "@shared/container/repositories";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

// Service import
import { UserProcessorShowService } from "./userProcessorShow.service";

describe("Service: UserProcessorShowService", () => {
  let user: User;
  let processorRepository: IProcessorRepository;

  let userProcessorShowService: UserProcessorShowService;

  beforeEach(async () => {
    processorRepository = container.resolve("ProcessorRepository");

    const userRepository = container.resolve<IUserRepository>("UserRepository");
    user = await userRepository.createOne({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      language: "en",
      phone_number: null,
    });

    userProcessorShowService = new UserProcessorShowService(
      processorRepository,
    );
  });

  it("should get one processor", async () => {
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

    const response = await userProcessorShowService.execute({
      processor_id: processor.id,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should throw if processor was not found", async () => {
    const expected = new AppError({
      key: "@processor_update_service/PROCESSOR_NOT_FOUND",
      message: "Processor not found.",
    });

    expect(() =>
      userProcessorShowService.execute({
        processor_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });
});
