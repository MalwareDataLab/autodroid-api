import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Util import
import { logger } from "@shared/utils/logger";

// Provider import
import { RedisInMemoryDatabaseProvider } from "./redisInMemoryDatabase.provider";

const { RedisMock, redisInstanceMock } = vi.hoisted(() => {
  const instance = {
    on: vi.fn(),
    connect: vi.fn(),
    ping: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
    flushdb: vi.fn(),
    status: "ready",
  };
  const RedisMockValue = vi.fn(() => instance);
  return { RedisMock: RedisMockValue, redisInstanceMock: instance };
});

vi.mock("ioredis", () => ({ Redis: RedisMock }));

vi.mock("@shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("Provider: RedisInMemoryDatabaseProvider", () => {
  let intervalCallback: (() => void) | undefined;

  const getHandlers = (event: string): ((...args: any[]) => void)[] =>
    redisInstanceMock.on.mock.calls
      .filter(([registeredEvent]) => registeredEvent === event)
      .map(([, handler]) => handler);

  beforeEach(() => {
    vi.clearAllMocks();
    intervalCallback = undefined;
    redisInstanceMock.status = "ready";
    redisInstanceMock.connect.mockResolvedValue(undefined);
    redisInstanceMock.ping.mockResolvedValue("PONG");

    vi.spyOn(global, "setInterval").mockImplementation(((
      callback: () => void,
    ) => {
      intervalCallback = callback;
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setInterval);

    vi.spyOn(global, "clearInterval").mockImplementation(
      (() => undefined) as unknown as typeof clearInterval,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should connect and expose the redis client through the provider getter", async () => {
    const provider = new RedisInMemoryDatabaseProvider();
    await provider.initialization;

    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({ lazyConnect: true }),
    );
    expect(redisInstanceMock.connect).toHaveBeenCalledOnce();
    expect(redisInstanceMock.ping).toHaveBeenCalledOnce();
    expect(provider.provider).toBe(redisInstanceMock);
    expect(provider.connection_name).toBe("default");
    expect(intervalCallback).toBeTypeOf("function");
  });

  it("should not schedule the health check when the connection fails", async () => {
    redisInstanceMock.connect.mockRejectedValueOnce(
      new Error("Connection is closed."),
    );

    const provider = new RedisInMemoryDatabaseProvider();

    await expect(provider.initialization).rejects.toThrowError(
      expect.objectContaining({
        message: expect.stringContaining("Connection is closed."),
      }),
    );
    expect(intervalCallback).toBeUndefined();
  });

  it("should apply the adapter options when a resolver function is provided", async () => {
    const adapterOptions = vi.fn((defaultOptions: any) => ({
      ...defaultOptions,
      db: 5,
    }));

    const provider = new RedisInMemoryDatabaseProvider("cache", adapterOptions);
    await provider.initialization;

    expect(adapterOptions).toHaveBeenCalledOnce();
    expect(provider.connection_name).toBe("cache");
    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({ db: 5, lazyConnect: true }),
    );
  });

  it("should log an error through both registered error handlers", async () => {
    const provider = new RedisInMemoryDatabaseProvider();
    await provider.initialization;

    const [primaryErrorHandler, secondaryErrorHandler] = getHandlers("error");

    primaryErrorHandler("connection refused");
    secondaryErrorHandler(new Error("socket closed"));
    secondaryErrorHandler(undefined);

    expect(logger.error).toHaveBeenCalledTimes(3);
  });

  it("should log an info message when reconnecting", async () => {
    const provider = new RedisInMemoryDatabaseProvider();
    await provider.initialization;

    const [reconnectingHandler] = getHandlers("reconnecting");
    reconnectingHandler();

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("reconnecting"),
    );
  });

  it("should clear the health check interval when the connection ends", async () => {
    const provider = new RedisInMemoryDatabaseProvider();
    await provider.initialization;

    const [endHandler] = getHandlers("end");
    endHandler();

    expect(clearInterval).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("connection closed"),
    );
  });

  it("should ping the client on the health check without logging when reachable", async () => {
    const provider = new RedisInMemoryDatabaseProvider();
    await provider.initialization;
    redisInstanceMock.ping.mockClear();

    await intervalCallback?.();

    expect(redisInstanceMock.ping).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should log an error on the health check when the client is unreachable", async () => {
    const provider = new RedisInMemoryDatabaseProvider();
    await provider.initialization;

    redisInstanceMock.status = "ready";
    redisInstanceMock.ping.mockRejectedValueOnce(new Error("timeout"));
    await intervalCallback?.();

    redisInstanceMock.ping.mockRejectedValueOnce(undefined);
    await intervalCallback?.();

    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it("should skip the health check error log when the connection already ended", async () => {
    const provider = new RedisInMemoryDatabaseProvider();
    await provider.initialization;

    redisInstanceMock.status = "end";
    redisInstanceMock.ping.mockRejectedValueOnce(new Error("timeout"));
    await intervalCallback?.();

    expect(logger.error).not.toHaveBeenCalled();
  });
});
