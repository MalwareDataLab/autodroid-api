import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Error import
import { WebsocketUnauthorizedError } from "@shared/infrastructure/websocket/errors/WebsocketUnauthorized.error";

// Service import
import { HandleWorkerAuthenticationService } from "@modules/worker/services/handleWorkerAuthentication.service";

// Target import
import { websocketWorkerAuthenticationMiddleware } from "./websocketWorkerAuthentication.middleware";

describe("Middleware: websocketWorkerAuthenticationMiddleware", () => {
  const worker = workerFactory.build();
  const workerSession = { worker };

  let handleWorkerAuthenticationService: { execute: ReturnType<typeof vi.fn> };

  let next: ReturnType<typeof vi.fn>;

  const buildSocket = (auth: Record<string, any>): any => ({
    handshake: { auth },
    data: {},
    request: { language: "en" },
  });

  beforeEach(() => {
    handleWorkerAuthenticationService = { execute: vi.fn() };

    next = vi.fn();

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === HandleWorkerAuthenticationService)
        return handleWorkerAuthenticationService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });
  });

  it("should attach the worker session to the socket data and call next without an error", async () => {
    const socket = buildSocket({
      kind: "WORKER",
      token: "Bearer worker-access-token",
    });
    handleWorkerAuthenticationService.execute.mockResolvedValueOnce(
      workerSession,
    );

    await websocketWorkerAuthenticationMiddleware(socket, next);

    expect(handleWorkerAuthenticationService.execute).toHaveBeenCalledWith({
      access_token: "worker-access-token",
      language: "en",
    });
    expect(socket.data).toEqual({
      kind: "WORKER",
      worker_session: workerSession,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("should call next with an unauthorized error when the authentication fails", async () => {
    const socket = buildSocket({
      kind: "WORKER",
      token: "Bearer invalid-token",
    });
    handleWorkerAuthenticationService.execute.mockRejectedValueOnce(
      new Error("invalid worker token"),
    );

    await websocketWorkerAuthenticationMiddleware(socket, next);

    expect(socket.data).toEqual({});
    expect(next).toHaveBeenCalledWith(expect.any(WebsocketUnauthorizedError));
  });

  it("should skip the authentication for a non worker handshake kind", async () => {
    const socket = buildSocket({ kind: "USER", token: "Bearer token" });

    await websocketWorkerAuthenticationMiddleware(socket, next);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(socket.data).toEqual({});
    expect(next).toHaveBeenCalledWith();
  });

  it("should skip the authentication for a worker handshake without a token", async () => {
    const socket = buildSocket({ kind: "WORKER" });

    await websocketWorkerAuthenticationMiddleware(socket, next);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(socket.data).toEqual({});
    expect(next).toHaveBeenCalledWith();
  });
});
