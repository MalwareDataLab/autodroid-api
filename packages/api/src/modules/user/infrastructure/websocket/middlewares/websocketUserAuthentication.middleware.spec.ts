import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Error import
import { WebsocketUnauthorizedError } from "@shared/infrastructure/websocket/errors/WebsocketUnauthorized.error";

// Service import
import { HandleAuthenticationService } from "@modules/authentication/services/handleAuthentication.service";

// Target import
import { websocketUserAuthenticationMiddleware } from "./websocketUserAuthentication.middleware";

describe("Middleware: websocketUserAuthenticationMiddleware", () => {
  const user = userFactory.build();
  const session = { user, is_admin: false };

  let handleAuthenticationService: { execute: ReturnType<typeof vi.fn> };

  let next: ReturnType<typeof vi.fn>;

  const buildSocket = (auth: Record<string, any>): any => ({
    handshake: { auth },
    data: {},
    request: { language: "pt" },
  });

  beforeEach(() => {
    handleAuthenticationService = { execute: vi.fn() };

    next = vi.fn();

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === HandleAuthenticationService)
        return handleAuthenticationService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });
  });

  it("should attach the user session to the socket data and call next without an error", async () => {
    const socket = buildSocket({ kind: "USER", token: "Bearer access-token" });
    handleAuthenticationService.execute.mockResolvedValueOnce(session);

    await websocketUserAuthenticationMiddleware(socket, next);

    expect(handleAuthenticationService.execute).toHaveBeenCalledWith({
      allow_existing_only: true,
      access_token: "access-token",
      language: "pt",
    });
    expect(socket.data).toEqual({ kind: "USER", user_session: session });
    expect(next).toHaveBeenCalledWith();
  });

  it("should call next with an unauthorized error when the authentication fails", async () => {
    const socket = buildSocket({ kind: "USER", token: "Bearer invalid-token" });
    handleAuthenticationService.execute.mockRejectedValueOnce(
      new Error("invalid token"),
    );

    await websocketUserAuthenticationMiddleware(socket, next);

    expect(socket.data).toEqual({});
    expect(next).toHaveBeenCalledWith(expect.any(WebsocketUnauthorizedError));
  });

  it("should skip the authentication for a non user handshake kind", async () => {
    const socket = buildSocket({ kind: "WORKER", token: "Bearer token" });

    await websocketUserAuthenticationMiddleware(socket, next);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(socket.data).toEqual({});
    expect(next).toHaveBeenCalledWith();
  });

  it("should skip the authentication for a user handshake without a token", async () => {
    const socket = buildSocket({ kind: "USER" });

    await websocketUserAuthenticationMiddleware(socket, next);

    expect(container.resolve).not.toHaveBeenCalled();
    expect(socket.data).toEqual({});
    expect(next).toHaveBeenCalledWith();
  });
});
