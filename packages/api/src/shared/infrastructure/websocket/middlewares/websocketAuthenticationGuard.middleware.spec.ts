import { describe, expect, it, vi } from "vitest";

// Error import
import { WebsocketUnauthorizedError } from "../errors/WebsocketUnauthorized.error";

// Middleware import
import { websocketAuthenticationGuardMiddleware } from "./websocketAuthenticationGuard.middleware";

const buildSocket = (data: any): any => ({ data });

describe("Middleware: websocketAuthenticationGuardMiddleware", () => {
  it("should call next for an authenticated user socket", async () => {
    const next = vi.fn();
    const socket = buildSocket({
      kind: "USER",
      user_session: { user: { id: "user-id" } },
    });

    await websocketAuthenticationGuardMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should call next for an authenticated worker socket", async () => {
    const next = vi.fn();
    const socket = buildSocket({
      kind: "WORKER",
      worker_session: { worker: { id: "worker-id" } },
    });

    await websocketAuthenticationGuardMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should reject an unauthenticated socket with an unauthorized error", async () => {
    const next = vi.fn();
    const socket = buildSocket({ kind: "USER", user_session: undefined });

    await websocketAuthenticationGuardMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(WebsocketUnauthorizedError));
  });
});
