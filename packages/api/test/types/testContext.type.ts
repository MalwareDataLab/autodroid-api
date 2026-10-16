import type { PrismaClient } from "@prisma/client";
import type * as Mongoose from "mongoose";
import { Request, Test } from "supertest";
import TestAgent from "supertest/lib/agent";
import { DependencyContainer } from "tsyringe";

// Provider import
import type { IAuthenticationMethod } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import type { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";
import type { RedisInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/implementations/redisInMemoryDatabase.provider";
import type { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import type { INonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";

// Util import
import type { App } from "../utils/getServer.util";
import type { IFirebaseSessionDTO } from "../utils/startAndGetSessionToken.util";

// Repository import
import { Repository, RepositoryToken } from "@shared/container/repositories";

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

  authenticationMethod?: IAuthenticationMethod;
};
