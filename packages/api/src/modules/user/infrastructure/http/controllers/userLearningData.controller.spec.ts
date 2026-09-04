import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserUpdateLearningDataService } from "@modules/user/services/userUpdateLearningData.service";

// Target import
import { UserLearningDataController } from "./userLearningData.controller";

describe("Controller: UserLearningDataController", () => {
  const user = userFactory.build();

  let userUpdateLearningDataService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let userLearningDataController: UserLearningDataController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userUpdateLearningDataService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserUpdateLearningDataService)
        return userUpdateLearningDataService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userLearningDataController = new UserLearningDataController();
  });

  it("should update the learning data forwarding the whole body as params", async () => {
    const body = { data: { "0": 10 } };
    const updatedUser = userFactory.build({ learning_data: { "0": 10 } });
    userUpdateLearningDataService.execute.mockResolvedValueOnce(updatedUser);

    const result = await userLearningDataController.update(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(userUpdateLearningDataService.execute).toHaveBeenCalledWith({
      user,
      params: body,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(updatedUser));
    expect(result).toBe(response);
  });

  it("should propagate a failure updating the learning data", async () => {
    const error = new Error("learning data update failed");
    userUpdateLearningDataService.execute.mockRejectedValueOnce(error);

    await expect(
      userLearningDataController.update(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
