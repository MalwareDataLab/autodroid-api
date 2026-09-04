import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { NextFunction, Request, Response } from "express";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Service import
import { HandleWorkerAuthenticationService } from "@modules/worker/services/handleWorkerAuthentication.service";

// Target import
import { workerAuthenticationMiddleware } from "./workerAuthentication.middleware";

describe("Middleware: workerAuthenticationMiddleware", () => {
  const worker = workerFactory.build();
  const workerSession = { worker };

  const agent_info = { ip: "10.0.0.1", browser: "worker-agent" };

  let handleWorkerAuthenticationService: { execute: ReturnType<typeof vi.fn> };

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
    handleWorkerAuthenticationService = { execute: vi.fn() };

    next = vi.fn();
    response = {} as Response;

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === HandleWorkerAuthenticationService)
        return handleWorkerAuthenticationService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });
  });

  it("should attach the resolved worker session and call next for a bearer token", async () => {
    const request = buildRequest({
      headers: { authorization: "Bearer worker-access-token" },
    });
    handleWorkerAuthenticationService.execute.mockResolvedValueOnce(
      workerSession,
    );

    await workerAuthenticationMiddleware(request, response, next);

    expect(handleWorkerAuthenticationService.execute).toHaveBeenCalledWith({
      access_token: "worker-access-token",
      language: "en",
      agent_info,
    });
    expect(request.worker_session).toBe(workerSession);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should null the worker session and call next when there is no authorization header", async () => {
    const request = buildRequest();

    await workerAuthenticationMiddleware(request, response, next);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(request.worker_session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should null the worker session when the authentication fails", async () => {
    const request = buildRequest({
      headers: { authorization: "Bearer invalid-token" },
    });
    handleWorkerAuthenticationService.execute.mockRejectedValueOnce(
      new Error("invalid worker token"),
    );

    await workerAuthenticationMiddleware(request, response, next);

    expect(handleWorkerAuthenticationService.execute).toHaveBeenCalledWith({
      access_token: "invalid-token",
      language: "en",
      agent_info,
    });
    expect(request.worker_session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should still attempt the authentication with an undefined token for a header without a scheme separator", async () => {
    const request = buildRequest({
      headers: { authorization: "bare-token-without-scheme" },
    });
    handleWorkerAuthenticationService.execute.mockRejectedValueOnce(
      new Error("invalid worker token"),
    );

    await workerAuthenticationMiddleware(request, response, next);

    expect(handleWorkerAuthenticationService.execute).toHaveBeenCalledWith({
      access_token: undefined,
      language: "en",
      agent_info,
    });
    expect(request.worker_session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
