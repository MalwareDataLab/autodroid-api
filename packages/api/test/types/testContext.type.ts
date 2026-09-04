import { DependencyContainer } from "tsyringe";
import type { PrismaClient } from "@prisma/client";
import type * as Mongoose from "mongoose";
import TestAgent from "supertest/lib/agent";
import { Request, Test } from "supertest";

// Provider import
import type { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";
import type { INonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";
import type { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import type { RedisInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/implementations/redisInMemoryDatabase.provider";

// Type import
import { Repository, RepositoryToken } from "@shared/container/repositories";
import type { IFirebaseSessionDTO } from "../utils/startAndGetSessionToken.util";
import type { App } from "../utils/getServer.util";

export type TestContext = {
  DatabaseUrl: string;
  DatabaseProvider?: IDatabaseProvider;
  PrismaDatabaseProvider?: PrismaClient;

  NonRelationalDatabaseUrl: string;
  NonRelationalDatabaseProvider?: INonRelationalDatabaseProvider;
  MongooseNonRelationalDatabaseProvider?: Mongoose.Connection;

  InMemoryDatabaseProvider?: IInMemoryDatabaseProvider;
  RedisInMemoryDatabaseProvider?: RedisInMemoryDatabaseProvider;

  container: DependencyContainer;

  repositories: {
    [token in RepositoryToken]: Repository<token>;
  };

  request: TestAgent<Test>;
  gql: Test;
  userAuthorized: <T extends Request>(arg: T) => T;
  adminAuthorized: <T extends Request>(arg: T) => T;

  app: App;
  userSession: IFirebaseSessionDTO;
  adminSession: IFirebaseSessionDTO;
};
