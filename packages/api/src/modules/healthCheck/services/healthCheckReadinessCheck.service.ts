import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import { INonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";

@injectable()
class HealthCheckReadinessCheckService {
  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,

    @inject("NonRelationalDatabaseProvider")
    private nonRelationalDatabaseProvider: INonRelationalDatabaseProvider,

    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}
  public async execute(): Promise<void> {
    try {
      await this.databaseProvider.client.user.findFirst();
    } catch (error) {
      throw new AppError({
        key: "@health_check_readiness_check_service/DATABASE_NOT_READY",
        message: "Database is not ready",
        statusCode: 503,
      });
    }

    try {
      await this.nonRelationalDatabaseProvider.connection.listCollections();
    } catch (error) {
      throw new AppError({
        key: "@health_check_readiness_check_service/NON_RELATIONAL_DATABASE_NOT_READY",
        message: "Non-relational database is not ready",
        statusCode: 503,
      });
    }

    try {
      await this.inMemoryDatabaseProvider.connection.ping();
    } catch (error) {
      throw new AppError({
        key: "@health_check_readiness_check_service/IN_MEMORY_DATABASE_NOT_READY",
        message: "In-memory database is not ready",
        statusCode: 503,
      });
    }
  }
}

export { HealthCheckReadinessCheckService };
