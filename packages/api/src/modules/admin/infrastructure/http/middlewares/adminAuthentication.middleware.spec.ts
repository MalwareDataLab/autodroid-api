import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextFunction, Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Error import
import { AppError } from "@shared/errors/AppError";

// Target import
import { adminAuthenticationMiddleware } from "./adminAuthentication.middleware";

describe("Middleware: adminAuthenticationMiddleware", () => {
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

  it("should call next when the session user is an admin", async () => {
    const request = buildRequest({ user, is_admin: true });

    await adminAuthenticationMiddleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(translate).not.toHaveBeenCalled();
  });

  it("should throw a not authenticated error when there is no session", async () => {
    const request = buildRequest(undefined);

    await expect(
      adminAuthenticationMiddleware(request, response, next),
    ).rejects.toEqual(
      expect.objectContaining({
        key: "@admin_auth_middleware/NOT_AUTHENTICATED",
        message: "You're not authenticated",
        statusCode: 401,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should throw a not authenticated error when the session carries no user", async () => {
    const request = buildRequest({ user: undefined, is_admin: true });

    await expect(
      adminAuthenticationMiddleware(request, response, next),
    ).rejects.toBeInstanceOf(AppError);
    expect(next).not.toHaveBeenCalled();
    expect(translate).toHaveBeenCalledWith(
      "@admin_auth_middleware/NOT_AUTHENTICATED",
      "You're not authenticated",
    );
  });

  it("should throw a not an admin error when the session user is not an admin", async () => {
    const request = buildRequest({ user, is_admin: false });

    await expect(
      adminAuthenticationMiddleware(request, response, next),
    ).rejects.toEqual(
      expect.objectContaining({
        key: "@admin_auth_middleware/NOT_AN_ADMIN",
        message: "You're not an admin.",
        statusCode: 401,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
