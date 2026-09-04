import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserUpdateDataService } from "@modules/user/services/userUpdateData.service";

// Target import
import { UserController } from "./user.controller";

describe("Controller: UserController", () => {
  const user = userFactory.build();

  let userUpdateDataService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let userController: UserController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userUpdateDataService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserUpdateDataService) return userUpdateDataService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userController = new UserController();
  });

  it("should show the session user without resolving any service", async () => {
    const result = await userController.show(
      buildRequest(),
      response as unknown as Response,
    );

    expect(response.json).toHaveBeenCalledWith(process(user));
    expect(container.resolve).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it("should answer null when there is no session on the request", async () => {
    await userController.show(
      buildRequest({ user_session: undefined }),
      response as unknown as Response,
    );

    expect(response.json).toHaveBeenCalledWith(null);
  });

  it("should update the session user forwarding the whole body as data", async () => {
    const body = { name: "Ada Lovelace" };
    const updatedUser = userFactory.build({ name: "Ada Lovelace" });
    userUpdateDataService.execute.mockResolvedValueOnce(updatedUser);

    const result = await userController.update(
      buildRequest({ body }),
      response as unknown as Response,
    );

    expect(userUpdateDataService.execute).toHaveBeenCalledWith({
      user,
      data: body,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(updatedUser));
    expect(result).toBe(response);
  });

  it("should propagate a failure updating the session user", async () => {
    const error = new Error("update failed");
    userUpdateDataService.execute.mockRejectedValueOnce(error);

    await expect(
      userController.update(buildRequest(), response as unknown as Response),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
