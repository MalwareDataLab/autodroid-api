import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextFunction, Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Error import
import { AppError } from "@shared/errors/AppError";

// Target import
import { userAuthenticationMiddleware } from "./userAuthentication.middleware";

describe("Middleware: userAuthenticationMiddleware", () => {
  const user = userFactory.build();

  let translate: ReturnType<typeof vi.fn>;
  let next: NextFunction;
  let response: Response;

  const buildRequest = (user_session: any) =>
    ({ t: translate, user_session }) as unknown as Request;

  beforeEach(() => {
    translate = vi.fn((_key: string, fallback: string) => fallback);
    next = vi.fn();
    response = {} as Response;
  });

  it("should call next when the request carries a session user", async () => {
    await userAuthenticationMiddleware(buildRequest({ user }), response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(translate).not.toHaveBeenCalled();
  });

  it("should throw a not authenticated error when there is no session", async () => {
    await expect(
      userAuthenticationMiddleware(buildRequest(undefined), response, next),
    ).rejects.toEqual(
      expect.objectContaining({
        key: "@user_auth_middleware/NOT_AUTHENTICATED",
        message: "Not authenticated",
        statusCode: 401,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should throw a not authenticated error when the session carries no user", async () => {
    await expect(
      userAuthenticationMiddleware(
        buildRequest({ user: undefined }),
        response,
        next,
      ),
    ).rejects.toBeInstanceOf(AppError);
    expect(translate).toHaveBeenCalledWith(
      "@user_auth_middleware/NOT_AUTHENTICATED",
      "Not authenticated",
    );
    expect(next).not.toHaveBeenCalled();
  });
});
