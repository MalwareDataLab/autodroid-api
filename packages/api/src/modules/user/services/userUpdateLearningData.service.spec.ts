import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IUserRepository } from "../repositories/IUser.repository";

// Factory import
import { userFactory } from "../entities/factories/user.factory";

// Service import
import { UserUpdateLearningDataService } from "./userUpdateLearningData.service";

describe("Service: UserUpdateLearningDataService", () => {
  let userRepositoryMock: Mocked<IUserRepository>;

  let userUpdateLearningDataService: UserUpdateLearningDataService;

  beforeEach(() => {
    userRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    userUpdateLearningDataService = new UserUpdateLearningDataService(
      userRepositoryMock,
    );
  });

  it("should update the user learning data", async () => {
    const user = userFactory.build();
    const updatedUser = userFactory.build({
      id: user.id,
      learning_data: { progress: 42 },
    });

    userRepositoryMock.updateOne.mockResolvedValueOnce(updatedUser);

    const response = await userUpdateLearningDataService.execute({
      user,
      params: { data: { progress: 42 } },
      language: "en",
    });

    expect(response).toBe(updatedUser);
    expect(userRepositoryMock.updateOne).toHaveBeenCalledWith(
      { id: user.id },
      { learning_data: { progress: 42 } },
    );
  });

  it("should throw if the user is not found after update", async () => {
    const user = userFactory.build();

    userRepositoryMock.updateOne.mockResolvedValueOnce(null);

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
