import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { NextFunction, Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { HandleAuthenticationService } from "@modules/authentication/services/handleAuthentication.service";

// Target import
import { authenticationMiddleware } from "./authentication.middleware";

describe("Middleware: authenticationMiddleware", () => {
  const user = userFactory.build();
  const session = { user, is_admin: false };

  const agent_info = { ip: "127.0.0.1", browser: "vitest" };

  let handleAuthenticationService: { execute: ReturnType<typeof vi.fn> };

  let next: NextFunction;
  let response: Response;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      language: "en",
      headers: {},
      agent_info,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    handleAuthenticationService = { execute: vi.fn() };

    next = vi.fn();
    response = {} as Response;

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === HandleAuthenticationService)
        return handleAuthenticationService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });
  });

  it("should attach the resolved session and call next for a bearer token", async () => {
    const request = buildRequest({
      headers: { authorization: "Bearer access-token" },
    });
    handleAuthenticationService.execute.mockResolvedValueOnce(session);

    await authenticationMiddleware(request, response, next);

    expect(handleAuthenticationService.execute).toHaveBeenCalledWith({
      access_token: "access-token",
      language: "en",
      agent_info,
    });
    expect(request.user_session).toBe(session);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should leave the session undefined and call next when there is no authorization header", async () => {
    const request = buildRequest();

    await authenticationMiddleware(request, response, next);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(request.user_session).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should leave the session undefined when the authorization header carries no token", async () => {
    const request = buildRequest({ headers: { authorization: "Bearer" } });

    await authenticationMiddleware(request, response, next);

    expect(handleAuthenticationService.execute).not.toHaveBeenCalled();
    expect(request.user_session).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should swallow an authentication failure leaving the session undefined and calling next once", async () => {
    const request = buildRequest({
      headers: { authorization: "Bearer invalid-token" },
    });
    handleAuthenticationService.execute.mockRejectedValueOnce(
      new Error("invalid token"),
    );

    await authenticationMiddleware(request, response, next);

    expect(handleAuthenticationService.execute).toHaveBeenCalledWith({
      access_token: "invalid-token",
      language: "en",
      agent_info,
    });
    expect(request.user_session).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
