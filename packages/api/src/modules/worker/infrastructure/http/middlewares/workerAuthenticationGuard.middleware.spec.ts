import { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Error import
import { AppError } from "@shared/errors/AppError";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Target import
import { workerAuthenticationGuardMiddleware } from "./workerAuthenticationGuard.middleware";

describe("Middleware: workerAuthenticationGuardMiddleware", () => {
  const worker = workerFactory.build();

  let translate: ReturnType<typeof vi.fn>;
  let next: NextFunction;
  let response: Response;

  const buildRequest = (worker_session: any) =>
    ({ t: translate, worker_session }) as unknown as Request;

  beforeEach(() => {
    translate = vi.fn((_key: string, fallback: string) => fallback);
    next = vi.fn();
    response = {} as Response;
  });

  it("should call next when the request carries a session worker", async () => {
    await workerAuthenticationGuardMiddleware(
      buildRequest({ worker }),
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(translate).not.toHaveBeenCalled();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])(
    "should throw a not authenticated error when the session is %s",
    async (_label, worker_session) => {
      await expect(
        workerAuthenticationGuardMiddleware(
          buildRequest(worker_session),
          response,
          next,
        ),
      ).rejects.toEqual(
        expect.objectContaining({
          key: "@worker_auth_middleware/NOT_AUTHENTICATED",
          message: "Not authenticated",
          statusCode: 401,
        }),
      );
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("should throw a not authenticated error when the session carries no worker", async () => {
    await expect(
      workerAuthenticationGuardMiddleware(
        buildRequest({ worker: undefined }),
        response,
        next,
      ),
    ).rejects.toBeInstanceOf(AppError);
    expect(translate).toHaveBeenCalledWith(
      "@worker_auth_middleware/NOT_AUTHENTICATED",
      "Not authenticated",
    );
    expect(next).not.toHaveBeenCalled();
  });
});
