import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Error import
import { AppError } from "@shared/errors/AppError";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { UserProcessorShowService } from "./userProcessorShow.service";
import { processorFactory } from "../entities/factories/processor.factory";

describe("Service: UserProcessorShowService", () => {
  let user: User;
  let userProcessorShowService: UserProcessorShowService;

  beforeEach(async () => {
    user = await userFactory.create();
    userProcessorShowService = container.resolve(UserProcessorShowService);
  });

  it("should get one processor", async () => {
    const processor = await processorFactory.create({
      user_id: user.id,
    });

    const response = await userProcessorShowService.execute({
      user,
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
        user,
        processor_id: faker.string.uuid(),
        language: "en",
      }),
    ).rejects.toThrowError(expected);
  });
});
