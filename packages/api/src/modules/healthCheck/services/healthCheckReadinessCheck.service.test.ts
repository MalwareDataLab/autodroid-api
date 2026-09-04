import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";
import { INonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Service import
import { HealthCheckReadinessCheckService } from "./healthCheckReadinessCheck.service";

describe("Service: HealthCheckReadinessCheckService", () => {
  let databaseProvider: IDatabaseProvider;
  let nonRelationalDatabaseProvider: INonRelationalDatabaseProvider;
  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;

  let healthCheckReadinessCheckService: HealthCheckReadinessCheckService;

  beforeEach(() => {
    databaseProvider = container.resolve("DatabaseProvider");
    nonRelationalDatabaseProvider = container.resolve(
      "NonRelationalDatabaseProvider",
    );
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");

    healthCheckReadinessCheckService = new HealthCheckReadinessCheckService(
      databaseProvider,
      nonRelationalDatabaseProvider,
      inMemoryDatabaseProvider,
    );
  });

  it("should resolve when every real database is ready", async () => {
    await expect(
      healthCheckReadinessCheckService.execute(),
    ).resolves.toBeUndefined();
  });

  // The relational/non-relational/in-memory clients are real, proxy-based
  // driver objects shared across every test in this file (only DB rows get
  // truncated between tests). vi.spyOn-ing a method directly on them (e.g.
  // Prisma's `client.user`) was found to permanently corrupt that shared
  // client for every later test in the file, surviving even
  // vi.restoreAllMocks(). Each "not ready" case below instead builds the
  // service with two real, untouched dependencies plus one lightweight
  // broken double for just the dependency under test — real integration
  // everywhere except the single call being forced to fail.

  it("should throw when the relational database is not ready", async () => {
    const brokenDatabaseProvider = {
      ...databaseProvider,
      client: {
        ...databaseProvider.client,
        user: {
          findFirst: vi.fn().mockRejectedValueOnce(new Error("down")),
        },
      },
    } as unknown as IDatabaseProvider;

    const service = new HealthCheckReadinessCheckService(
      brokenDatabaseProvider,
      nonRelationalDatabaseProvider,
      inMemoryDatabaseProvider,
    );

    await expect(() => service.execute()).rejects.toThrowError(
      expect.objectContaining({
        key: "@health_check_readiness_check_service/DATABASE_NOT_READY",
      }),
    );
  });

  it("should throw when the non-relational database is not ready", async () => {
    const brokenNonRelationalDatabaseProvider = {
      ...nonRelationalDatabaseProvider,
      connection: {
        listCollections: vi.fn().mockRejectedValueOnce(new Error("down")),
      },
    } as unknown as INonRelationalDatabaseProvider;

    const service = new HealthCheckReadinessCheckService(
      databaseProvider,
      brokenNonRelationalDatabaseProvider,
      inMemoryDatabaseProvider,
    );

    await expect(() => service.execute()).rejects.toThrowError(
      expect.objectContaining({
        key: "@health_check_readiness_check_service/NON_RELATIONAL_DATABASE_NOT_READY",
      }),
    );
  });

  it("should throw when the in-memory database is not ready", async () => {
    const brokenInMemoryDatabaseProvider = {
      ...inMemoryDatabaseProvider,
      connection: {
        ping: vi.fn().mockRejectedValueOnce(new Error("down")),
      },
    } as unknown as IInMemoryDatabaseProvider;

    const service = new HealthCheckReadinessCheckService(
      databaseProvider,
      nonRelationalDatabaseProvider,
      brokenInMemoryDatabaseProvider,
    );

    await expect(() => service.execute()).rejects.toThrowError(
      expect.objectContaining({
        key: "@health_check_readiness_check_service/IN_MEMORY_DATABASE_NOT_READY",
      }),
    );
  });
});
