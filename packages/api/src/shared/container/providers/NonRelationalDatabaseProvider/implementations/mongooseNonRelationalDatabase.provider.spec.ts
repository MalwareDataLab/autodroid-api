import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { logger } from "@shared/utils/logger";

const { createConnectionMock, connectionMock } = vi.hoisted(() => {
  const connection = {
    on: vi.fn(),
    plugin: vi.fn(),
    openUri: vi.fn(),
  };
  return {
    createConnectionMock: vi.fn(() => connection),
    connectionMock: connection,
  };
});

vi.mock("mongoose", () => ({ createConnection: createConnectionMock }));

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

vi.mock("@shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("Provider: MongooseNonRelationalDatabaseProvider", () => {
  const envMock = vi.mocked(getEnvConfig);

  let schemaMock: { virtual: Mock; set: Mock };
  let virtualGetMock: Mock;

  const loadProvider = async () => {
    vi.resetModules();
    const providerModule = await import(
      "./mongooseNonRelationalDatabase.provider"
    );
    return providerModule.MongooseNonRelationalDatabaseProvider;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    envMock.mockReturnValue({
      isTestEnv: true,
      NON_RELATIONAL_DATABASE_LOGGER_ENABLED: "false",
      NON_RELATIONAL_DATABASE_URL: "mongodb://localhost/db",
    } as any);

    virtualGetMock = vi.fn();
    schemaMock = {
      virtual: vi.fn(() => ({ get: virtualGetMock })),
      set: vi.fn(),
    };

    connectionMock.plugin.mockImplementation((registerPlugin: any) =>
      registerPlugin(schemaMock),
    );
    connectionMock.openUri.mockResolvedValue(undefined);
  });

  it("should create the connection, register the id plugin and open the default uri", async () => {
    const MongooseNonRelationalDatabaseProvider = await loadProvider();

    const provider = new MongooseNonRelationalDatabaseProvider();
    await provider.initialization;

    expect(createConnectionMock).toHaveBeenCalledOnce();
    expect(provider.connection).toBe(connectionMock);
    expect(schemaMock.virtual).toHaveBeenCalledWith("id");
    expect(schemaMock.set).toHaveBeenCalledWith("toJSON", { virtuals: true });
    expect(schemaMock.set).toHaveBeenCalledWith("toObject", { virtuals: true });
    expect(connectionMock.openUri).toHaveBeenCalledWith(
      "mongodb://localhost/db",
      { directConnection: true },
    );
  });

  it("should not register lifecycle handlers when logging is disabled", async () => {
    const MongooseNonRelationalDatabaseProvider = await loadProvider();

    const provider = new MongooseNonRelationalDatabaseProvider();
    await provider.initialization;

    expect(connectionMock.on).not.toHaveBeenCalled();
  });

  it("should expose the document id virtual getter", async () => {
    const MongooseNonRelationalDatabaseProvider = await loadProvider();

    const provider = new MongooseNonRelationalDatabaseProvider();
    await provider.initialization;

    const idGetter = virtualGetMock.mock.calls[0][0] as () => string;
    const documentId = idGetter.call({
      _id: { toHexString: () => "hex-id" },
    });

    expect(documentId).toBe("hex-id");
  });

  it("should register and invoke the lifecycle handlers when logging is enabled", async () => {
    envMock.mockReturnValue({
      isTestEnv: false,
      NON_RELATIONAL_DATABASE_LOGGER_ENABLED: "true",
      NON_RELATIONAL_DATABASE_URL: "mongodb://localhost/db",
    } as any);

    const MongooseNonRelationalDatabaseProvider = await loadProvider();

    const provider = new MongooseNonRelationalDatabaseProvider(
      "mongodb://custom/uri",
    );
    await provider.initialization;

    const errorHandler = connectionMock.on.mock.calls.find(
      ([event]) => event === "error",
    )?.[1];
    const disconnectedHandler = connectionMock.on.mock.calls.find(
      ([event]) => event === "disconnected",
    )?.[1];

    errorHandler(new Error("connection lost"));
    disconnectedHandler();

    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(connectionMock.openUri).toHaveBeenCalledWith(
      "mongodb://custom/uri",
      {},
    );
  });
});
