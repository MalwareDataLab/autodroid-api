import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";
import { INonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Service import
import { HealthCheckReadinessCheckService } from "./healthCheckReadinessCheck.service";

describe("Service: HealthCheckReadinessCheckService", () => {
  let databaseProviderMock: Mocked<IDatabaseProvider>;
  let nonRelationalDatabaseProviderMock: Mocked<INonRelationalDatabaseProvider>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;

  let findFirstMock: ReturnType<typeof vi.fn>;
  let listCollectionsMock: ReturnType<typeof vi.fn>;
  let pingMock: ReturnType<typeof vi.fn>;

  let healthCheckReadinessCheckService: HealthCheckReadinessCheckService;

  beforeEach(() => {
    findFirstMock = vi.fn().mockResolvedValue(null);
    listCollectionsMock = vi.fn().mockResolvedValue([]);
    pingMock = vi.fn().mockResolvedValue("PONG");

    databaseProviderMock = {
      initialization: Promise.resolve(),
      client: { user: { findFirst: findFirstMock } },
    } as unknown as Mocked<IDatabaseProvider>;

    nonRelationalDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { listCollections: listCollectionsMock },
    } as unknown as Mocked<INonRelationalDatabaseProvider>;

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { ping: pingMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    healthCheckReadinessCheckService = new HealthCheckReadinessCheckService(
      databaseProviderMock,
      nonRelationalDatabaseProviderMock,
      inMemoryDatabaseProviderMock,
    );
  });

  it("should resolve when every database is ready", async () => {
    await expect(
      healthCheckReadinessCheckService.execute(),
    ).resolves.toBeUndefined();
  });

  it("should throw when the relational database is not ready", async () => {
    findFirstMock.mockRejectedValueOnce(new Error("down"));

    await expect(() =>
      healthCheckReadinessCheckService.execute(),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@health_check_readiness_check_service/DATABASE_NOT_READY",
      }),
    );
  });

  it("should throw when the non-relational database is not ready", async () => {
    listCollectionsMock.mockRejectedValueOnce(new Error("down"));

    await expect(() =>
      healthCheckReadinessCheckService.execute(),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@health_check_readiness_check_service/NON_RELATIONAL_DATABASE_NOT_READY",
      }),
    );
  });

  it("should throw when the in-memory database is not ready", async () => {
    pingMock.mockRejectedValueOnce(new Error("down"));

    await expect(() =>
      healthCheckReadinessCheckService.execute(),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@health_check_readiness_check_service/IN_MEMORY_DATABASE_NOT_READY",
      }),
    );
  });
});
