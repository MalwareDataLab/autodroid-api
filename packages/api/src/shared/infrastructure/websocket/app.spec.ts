import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

// Middleware import
import { websocketUserAuthenticationMiddleware } from "@modules/user/infrastructure/websocket/middlewares/websocketUserAuthentication.middleware";
import { websocketWorkerAuthenticationMiddleware } from "@modules/worker/infrastructure/websocket/middlewares/websocketWorkerAuthentication.middleware";
import { websocketAuthenticationGuardMiddleware } from "./middlewares/websocketAuthenticationGuard.middleware";

// Target import
import { WebsocketApp } from "./app";

const hoisted = vi.hoisted(() => ({
  use: vi.fn(),
  on: vi.fn(),
  adapter: vi.fn(),
  emit: vi.fn(),
  duplicate: vi.fn(),
  initialize: vi.fn(),
}));

vi.mock("socket.io", () => ({
  Server: class {
    use = hoisted.use;

    on = hoisted.on;

    adapter = hoisted.adapter;
  },
}));

vi.mock("ioredis", () => ({
  Redis: class {
    duplicate = hoisted.duplicate;
  },
}));

vi.mock("@socket.io/redis-adapter", () => ({
  createAdapter: vi.fn(() => "redis-adapter"),
}));

vi.mock("./adapter", () => ({
  WebsocketAdapter: { initialize: hoisted.initialize },
}));

vi.mock(
  "@modules/user/infrastructure/websocket/middlewares/websocketUserAuthentication.middleware",
  () => ({ websocketUserAuthenticationMiddleware: vi.fn() }),
);

vi.mock(
  "@modules/worker/infrastructure/websocket/middlewares/websocketWorkerAuthentication.middleware",
  () => ({ websocketWorkerAuthenticationMiddleware: vi.fn() }),
);

vi.mock("./middlewares/websocketAuthenticationGuard.middleware", () => ({
  websocketAuthenticationGuardMiddleware: vi.fn(),
}));

const makeSocket = (data: Record<string, unknown>) => ({
  data,
  join: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
});

const roomMiddleware = () => hoisted.use.mock.calls[3][0];

const connectionHandler = () =>
  hoisted.on.mock.calls.find(([event]) => event === "connection")![1];

describe("App: WebsocketApp", () => {
  let bus: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    bus = { emit: vi.fn() };
    hoisted.initialize.mockReturnValue(bus);

    // eslint-disable-next-line no-new -- constructed for its middleware-registration side effect, the instance itself is never used
    new WebsocketApp({} as Server);
  });

  it("should register the authentication chain before the room middleware", () => {
    expect(hoisted.use).toHaveBeenCalledTimes(4);
    expect(hoisted.use.mock.calls[0][0]).toBe(
      websocketUserAuthenticationMiddleware,
    );
    expect(hoisted.use.mock.calls[1][0]).toBe(
      websocketWorkerAuthenticationMiddleware,
    );
    expect(hoisted.use.mock.calls[2][0]).toBe(
      websocketAuthenticationGuardMiddleware,
    );
  });

  it("should install the redis adapter built from a duplicated client", () => {
    expect(hoisted.duplicate).toHaveBeenCalledOnce();
    expect(hoisted.adapter).toHaveBeenCalledWith("redis-adapter");
  });

  it("should join a user to its own room", () => {
    const next = vi.fn();
    const socket = makeSocket({
      kind: "USER",
      user_session: { user: { id: "user-1" } },
    });

    roomMiddleware()(socket, next);

    expect(socket.join).toHaveBeenCalledWith("user:user-1");
    expect(next).toHaveBeenCalledOnce();
  });

  it("should join a worker to both the shared and its own room", () => {
    const next = vi.fn();
    const socket = makeSocket({
      kind: "WORKER",
      worker_session: { worker: { id: "worker-1" } },
    });

    roomMiddleware()(socket, next);

    expect(socket.join).toHaveBeenCalledWith("worker");
    expect(socket.join).toHaveBeenCalledWith("worker:worker-1");
  });

  it("should join no room when the session is absent", () => {
    const next = vi.fn();
    const socket = makeSocket({ kind: "USER" });

    roomMiddleware()(socket, next);

    expect(socket.join).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("should answer a ping with a pong", () => {
    const socket = makeSocket({});

    connectionHandler()(socket);
    const ping = socket.on.mock.calls.find(([event]) => event === "ping")![1];
    ping();

    expect(socket.emit).toHaveBeenCalledWith("pong");
  });

  it("should broadcast a worker status on both bus channels", () => {
    const socket = makeSocket({
      worker_session: { worker: { id: "worker-1" } },
    });

    connectionHandler()(socket);
    const status = socket.on.mock.calls.find(
      ([event]) => event === "worker:status",
    )![1];
    status({ status: "IDLE" });

    expect(bus.emit).toHaveBeenCalledWith("worker:status", {
      status: "IDLE",
      worker_id: "worker-1",
    });
    expect(bus.emit).toHaveBeenCalledWith("worker:worker-1:status", {
      status: "IDLE",
    });
  });

  it("should broadcast a processing acquisition keyed by worker and processing", () => {
    const socket = makeSocket({
      worker_session: { worker: { id: "worker-1" } },
    });

    connectionHandler()(socket);
    const acquired = socket.on.mock.calls.find(
      ([event]) => event === "worker:processing-acquired",
    )![1];
    acquired({ processing_id: "processing-1" });

    expect(bus.emit).toHaveBeenCalledWith(
      "worker:worker-1:processing:processing-1:acquired",
    );
  });
});
