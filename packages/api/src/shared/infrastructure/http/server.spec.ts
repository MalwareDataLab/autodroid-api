import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from "vitest";

const {
  appMock,
  containerMock,
  initAndWaitRequisitesMock,
  afterInitBootstrapListMock,
  jobProviderMock,
  databaseProviderMock,
  inMemoryDatabaseProviderMock,
  authenticationProviderMock,
  loggerMock,
  getEnvConfigMock,
} = vi.hoisted(() => {
  const jobProvider = { close: vi.fn() };
  const databaseProvider = { client: { $disconnect: vi.fn() } };
  const inMemoryDatabaseProvider = { connection: { quit: vi.fn() } };
  const authenticationProvider = { dispose: vi.fn() };

  return {
    appMock: {
      httpServer: { listen: vi.fn(), close: vi.fn() },
      graphqlServer: { initialization: Promise.resolve() },
      websocketServer: {
        initialization: Promise.resolve(),
        server: { local: { disconnectSockets: vi.fn() } },
      },
      samlManager: { initialization: Promise.resolve() },
    },
    containerMock: { resolve: vi.fn() },
    initAndWaitRequisitesMock: vi.fn(),
    afterInitBootstrapListMock: ["JobProvider"],
    jobProviderMock: jobProvider,
    databaseProviderMock: databaseProvider,
    inMemoryDatabaseProviderMock: inMemoryDatabaseProvider,
    authenticationProviderMock: authenticationProvider,
    loggerMock: { info: vi.fn(), error: vi.fn() },
    getEnvConfigMock: vi.fn(() => ({
      APP_PORT: 3333,
      NODE_ENV: "test",
      APP_INFO: { name: "autodroid-api", version: "1.2.3" },
    })),
  };
});

vi.mock("./app", () => ({ app: appMock }));

vi.mock("tsyringe", () => ({ container: containerMock }));

vi.mock("@shared/container", () => ({
  initAndWaitRequisites: initAndWaitRequisitesMock,
  afterInitBootstrapList: afterInitBootstrapListMock,
}));

vi.mock("@shared/utils/logger", () => ({ logger: loggerMock }));

vi.mock("@config/env", () => ({ getEnvConfig: getEnvConfigMock }));

const shutdownSignals = [
  "SIGHUP",
  "SIGINT",
  "SIGQUIT",
  "SIGILL",
  "SIGTRAP",
  "SIGABRT",
  "SIGBUS",
  "SIGFPE",
  "SIGSEGV",
  "SIGUSR2",
  "SIGTERM",
];

const resolvedProviders: Record<string, unknown> = {
  JobProvider: jobProviderMock,
  DatabaseProvider: databaseProviderMock,
  InMemoryDatabaseProvider: inMemoryDatabaseProviderMock,
  AuthenticationProvider: authenticationProviderMock,
};

describe("Server: http", () => {
  let processOnSpy: MockInstance;
  let processExitSpy: MockInstance;

  const loadServer = async () => {
    vi.resetModules();
    return import("./server");
  };

  const getShutdownHandler = () => {
    const registration = processOnSpy.mock.calls.find(([signal]) =>
      shutdownSignals.includes(signal),
    );
    return registration?.[1] as (signal: string) => Promise<void>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    processOnSpy = vi
      .spyOn(process, "on")
      .mockImplementation((() => process) as never);
    processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    getEnvConfigMock.mockReturnValue({
      APP_PORT: 3333,
      NODE_ENV: "test",
      APP_INFO: { name: "autodroid-api", version: "1.2.3" },
    });

    initAndWaitRequisitesMock.mockResolvedValue(undefined);
    appMock.httpServer.close.mockImplementation((callback: () => void) => {
      callback();
      return appMock.httpServer;
    });
    appMock.websocketServer.server.local.disconnectSockets.mockResolvedValue(
      undefined,
    );
    jobProviderMock.close.mockResolvedValue(undefined);
    databaseProviderMock.client.$disconnect.mockResolvedValue(undefined);
    inMemoryDatabaseProviderMock.connection.quit.mockResolvedValue(undefined);
    authenticationProviderMock.dispose.mockResolvedValue(undefined);
    containerMock.resolve.mockImplementation(
      (token: string) => resolvedProviders[token],
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should await every server layer and the after init requisites before listening", async () => {
    const { init } = await loadServer();

    await init();

    expect(initAndWaitRequisitesMock).toHaveBeenCalledWith({
      requisites: afterInitBootstrapListMock,
    });
    expect(appMock.httpServer.listen).toHaveBeenCalledWith(
      3333,
      expect.any(Function),
    );
    expect(initAndWaitRequisitesMock.mock.invocationCallOrder[0]).toBeLessThan(
      appMock.httpServer.listen.mock.invocationCallOrder[0],
    );
  });

  it("should log the running instance details once the port is bound", async () => {
    const { init } = await loadServer();

    await init();
    const [, listenCallback] = appMock.httpServer.listen.mock.calls[0];
    listenCallback();

    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining("autodroid-api test version 1.2.3"),
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining("running at port 3333"),
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining(`PID ${process.pid}`),
    );
  });

  it("should register the same shutdown handler for every supported signal", async () => {
    await loadServer();

    const registrations = processOnSpy.mock.calls.filter(([signal]) =>
      shutdownSignals.includes(signal),
    );

    expect(registrations.map(([signal]) => signal)).toEqual(shutdownSignals);
    expect(new Set(registrations.map(([, handler]) => handler)).size).toBe(1);
  });

  it("should close every layer in order and exit successfully", async () => {
    await loadServer();

    await getShutdownHandler()("SIGTERM");

    expect(appMock.httpServer.close).toHaveBeenCalledOnce();
    expect(
      appMock.websocketServer.server.local.disconnectSockets,
    ).toHaveBeenCalledWith(true);
    expect(containerMock.resolve).toHaveBeenNthCalledWith(1, "JobProvider");
    expect(containerMock.resolve).toHaveBeenNthCalledWith(
      2,
      "DatabaseProvider",
    );
    expect(containerMock.resolve).toHaveBeenNthCalledWith(
      3,
      "InMemoryDatabaseProvider",
    );
    expect(containerMock.resolve).toHaveBeenNthCalledWith(
      4,
      "AuthenticationProvider",
    );
    expect(jobProviderMock.close).toHaveBeenCalledOnce();
    expect(databaseProviderMock.client.$disconnect).toHaveBeenCalledOnce();
    expect(inMemoryDatabaseProviderMock.connection.quit).toHaveBeenCalledOnce();
    expect(authenticationProviderMock.dispose).toHaveBeenCalledOnce();

    expect(loggerMock.info).toHaveBeenCalledWith("💻 Server closed.");
    expect(loggerMock.info).toHaveBeenCalledWith("📡 Websocket server closed.");
    expect(loggerMock.info).toHaveBeenCalledWith("🔂 Background jobs stopped.");
    expect(loggerMock.info).toHaveBeenCalledWith(
      "💾 Database connection closed.",
    );
    expect(loggerMock.info).toHaveBeenCalledWith("💿 Redis connection closed.");
    expect(loggerMock.info).toHaveBeenCalledWith(
      "🔒 Authentication provided closed.",
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      "⛔ Got SIGTERM - Shutdown complete. Exiting...",
    );
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("should shut every remaining dependency down even when the earlier ones reject", async () => {
    appMock.httpServer.close.mockImplementation(() => {
      throw new Error("server already closed");
    });
    appMock.websocketServer.server.local.disconnectSockets.mockRejectedValue(
      new Error("sockets already detached"),
    );
    jobProviderMock.close.mockRejectedValue(new Error("queue unreachable"));
    databaseProviderMock.client.$disconnect.mockRejectedValue(
      new Error("database unreachable"),
    );
    inMemoryDatabaseProviderMock.connection.quit.mockRejectedValue(
      new Error("redis unreachable"),
    );
    authenticationProviderMock.dispose.mockRejectedValue(
      new Error("authentication unreachable"),
    );

    await loadServer();

    await getShutdownHandler()("SIGINT");

    expect(jobProviderMock.close).toHaveBeenCalledOnce();
    expect(databaseProviderMock.client.$disconnect).toHaveBeenCalledOnce();
    expect(inMemoryDatabaseProviderMock.connection.quit).toHaveBeenCalledOnce();
    expect(authenticationProviderMock.dispose).toHaveBeenCalledOnce();

    expect(loggerMock.info).not.toHaveBeenCalledWith("💻 Server closed.");
    expect(loggerMock.info).not.toHaveBeenCalledWith(
      "🔂 Background jobs stopped.",
    );
    expect(loggerMock.info).not.toHaveBeenCalledWith(
      "🔒 Authentication provided closed.",
    );
    expect(loggerMock.error).not.toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("should ignore a second shutdown invocation while one is already complete", async () => {
    await loadServer();
    const shutdownHandler = getShutdownHandler();

    await shutdownHandler("SIGINT");
    await shutdownHandler("SIGTERM");

    expect(appMock.httpServer.close).toHaveBeenCalledOnce();
    expect(jobProviderMock.close).toHaveBeenCalledOnce();
    expect(authenticationProviderMock.dispose).toHaveBeenCalledOnce();
    expect(processExitSpy).toHaveBeenCalledTimes(1);
    expect(
      loggerMock.info.mock.calls.filter(
        ([message]) => message === "⛔ Shutting down...",
      ),
    ).toHaveLength(1);
  });

  it("should log the failure and exit with code 1 when a provider cannot be resolved", async () => {
    containerMock.resolve.mockImplementation((token: string) => {
      if (token === "DatabaseProvider")
        throw new Error("DatabaseProvider is not registered");
      return resolvedProviders[token];
    });

    await loadServer();

    await getShutdownHandler()("SIGABRT");

    expect(jobProviderMock.close).toHaveBeenCalledOnce();
    expect(inMemoryDatabaseProviderMock.connection.quit).not.toHaveBeenCalled();
    expect(authenticationProviderMock.dispose).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      "❌ Got SIGABRT - Shutdown failed. DatabaseProvider is not registered",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should report an undefined message when the shutdown failure carries none", async () => {
    containerMock.resolve.mockImplementation(() => {
      throw Object.create(null);
    });

    await loadServer();

    await getShutdownHandler()("SIGSEGV");

    expect(loggerMock.error).toHaveBeenCalledWith(
      "❌ Got SIGSEGV - Shutdown failed. undefined",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should fall back to a generic app name when the package name is absent", async () => {
    getEnvConfigMock.mockReturnValue({
      APP_PORT: 3333,
      NODE_ENV: "test",
      APP_INFO: { name: "", version: "1.2.3" },
    });

    appMock.httpServer.listen.mockImplementation(
      (_port: number, callback: () => void) => {
        callback();
        return appMock.httpServer;
      },
    );

    const { init } = await loadServer();
    await init();

    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining("API"),
    );
  });
});
