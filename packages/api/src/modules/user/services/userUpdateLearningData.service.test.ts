import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";

// Repository import
import { IUserRepository } from "@shared/container/repositories";

// Factory import
import { userFactory } from "../entities/factories/user.factory";

// Service import
import { UserUpdateLearningDataService } from "./userUpdateLearningData.service";

describe("Service: UserUpdateLearningDataService", () => {
  let userRepository: IUserRepository;

  let userUpdateLearningDataService: UserUpdateLearningDataService;

  beforeEach(() => {
    userRepository = container.resolve("UserRepository");
    userUpdateLearningDataService = new UserUpdateLearningDataService(
      userRepository,
    );
  });

  it("should update the user learning data", async () => {
    const user = await userFactory.create();

    const response = await userUpdateLearningDataService.execute({
      user,
      params: { data: { progress: 42 } },
      language: "en",
    });

    expect(response.learning_data).toEqual({ progress: 42 });

    const found = await userRepository.findOne({ id: user.id });
    expect(found?.learning_data).toEqual({ progress: 42 });
  });

  it("should throw if the user is not found after update", async () => {
    const user = userFactory.build();

    await expect(() =>
      userUpdateLearningDataService.execute({
        user,
        params: { data: {} },
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_update_learning_data_service/USER_NOT_FOUND_AFTER_UPDATE",
      }),
    );
  });
});
