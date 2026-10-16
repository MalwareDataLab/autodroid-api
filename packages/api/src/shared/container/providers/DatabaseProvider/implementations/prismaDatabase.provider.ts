import { PrismaClient } from "@prisma/client";

// Configuration import
import { getEnvConfig } from "@config/env";

// Provider import
import { IDatabaseProvider } from "../models/IDatabase.provider";

// Util import
import { executeAction } from "@shared/utils/executeAction";

const logEnabled = getEnvConfig().DATABASE_LOGGER_ENABLED === "true";

class PrismaDatabaseProvider implements IDatabaseProvider {
  public readonly initialization: Promise<void>;

  private databaseProvider: PrismaClient;
  public readonly client: PrismaClient;

  constructor(
    client: PrismaClient = new PrismaClient({
      log: logEnabled ? ["query", "info", "warn", "error"] : [],
    }),
  ) {
    const prismaClient = client;
    this.databaseProvider = prismaClient;
    this.client = prismaClient;
    this.initialization = executeAction({
      action: () => this.databaseProvider.$connect(),
      actionName: "Database connection",
      logging: true,
    });
  }
}

export { PrismaDatabaseProvider };
