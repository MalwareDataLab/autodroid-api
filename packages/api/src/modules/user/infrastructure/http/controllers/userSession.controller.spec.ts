import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserSessionsCloseService } from "@modules/user/services/userSessionsClose.service";

// Target import
import { UserSessionController } from "./userSession.controller";

describe("Controller: UserSessionController", () => {
  const user = userFactory.build();
  const user_auth_provider_conn = {
    id: "auth-provider-conn-id",
    provider: "GOOGLE",
  };
  const user_session = { user, user_auth_provider_conn, is_admin: false };

  let userSessionsCloseService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let userSessionController: UserSessionController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session,
      language: "en",
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userSessionsCloseService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserSessionsCloseService) return userSessionsCloseService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userSessionController = new UserSessionController();
  });

  it("should answer the whole request session without resolving any service", async () => {
    const result = await userSessionController.get(
      buildRequest(),
      response as unknown as Response,
    );

    expect(response.json).toHaveBeenCalledWith(process(user_session));
    expect(container.resolve).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it("should close the sessions and answer the auth provider connection", async () => {
    userSessionsCloseService.execute.mockResolvedValueOnce(undefined);

    const result = await userSessionController.delete(
      buildRequest(),
      response as unknown as Response,
    );

    expect(userSessionsCloseService.execute).toHaveBeenCalledWith({
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(
      process(user_auth_provider_conn),
    );
    expect(result).toBe(response);
  });

  it("should propagate a failure closing the sessions", async () => {
    const error = new Error("close failed");
    userSessionsCloseService.execute.mockRejectedValueOnce(error);

    await expect(
      userSessionController.delete(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
