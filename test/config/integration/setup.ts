/* eslint-disable import/first */
import "reflect-metadata";
import dotenv from "dotenv";
import { afterEach, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { container as mainContainer } from "tsyringe";

dotenv.config({
  path: ".env.test",
});

// Container import
import {
  RepositoryToken,
  initRepositories,
  repositories,
} from "@shared/container/repositories";

// Provider import
import { PrismaDatabaseProvider } from "@shared/container/providers/DatabaseProvider/implementations/prismaDatabase.provider";
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";
import { MongooseNonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/implementations/mongooseNonRelationalDatabase.provider";
import { InMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider";
import { RedisInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/implementations/redisInMemoryDatabase.provider";
import { INonRelationalDatabaseProvider } from "@shared/container/providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { sleep } from "@shared/utils/sleep";

// Type import
import { TestContext } from "../../types/testContext.type";

const initRelationalDatabase = async (context: TestContext) => {
  const initialDatabaseUrl = process.env.DATABASE_URL;
  const url = new URL(initialDatabaseUrl!);
  url.pathname = `/test-${randomUUID()}`;

  const databaseUrl = url.toString();
  context.DatabaseUrl = databaseUrl;

  execSync("./node_modules/.bin/prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  const databaseProvider = new PrismaDatabaseProvider(prisma);

  context.DatabaseProvider = databaseProvider;
  context.PrismaDatabaseProvider = prisma;

  context.container.registerInstance<IDatabaseProvider>(
    "DatabaseProvider",
    databaseProvider,
  );

  await databaseProvider.initialization;
};

const disposeRelationalDatabase = async (context: TestContext) => {
  await context.PrismaDatabaseProvider?.$disconnect();

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const database = new URL(context.DatabaseUrl).pathname.replace("/", "");

  await client.connect();
  await client.query(`REVOKE CONNECT ON DATABASE "${database}" FROM public;`);
  await client.query(
    `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${database}' AND pid <> pg_backend_pid();`,
  );
  await client.query(`DROP DATABASE IF EXISTS "${database}"`);
  await client.end();
};

const initNonRelationalDatabase = async (context: TestContext) => {
  const initialNonRelationalDatabaseUrl =
    process.env.NON_RELATIONAL_DATABASE_URL;
  const uri = `${initialNonRelationalDatabaseUrl.split("/test")[0]}/test-${randomUUID()}`;

  context.NonRelationalDatabaseUrl = uri;

  const nonRelationDatabaseProvider = new MongooseNonRelationalDatabaseProvider(
    uri,
  );

  context.NonRelationalDatabaseProvider = nonRelationDatabaseProvider;
  context.MongooseNonRelationalDatabaseProvider =
    nonRelationDatabaseProvider.connection;

  context.container.registerInstance<INonRelationalDatabaseProvider>(
    "NonRelationalDatabaseProvider",
    nonRelationDatabaseProvider,
  );

  await nonRelationDatabaseProvider.initialization;
};

const disposeNonRelationalDatabase = async (context: TestContext) => {
  const { connection } = context.NonRelationalDatabaseProvider!;
  await connection.dropDatabase();
};

const initInMemoryDatabaseProvider = async (context: TestContext) => {
  const redis = new RedisInMemoryDatabaseProvider(
    "default",
    defaultOptions => ({
      ...defaultOptions,
      keyPrefix: `test-${randomUUID()}`,
    }),
  );

  const inMemoryDatabaseProvider = new InMemoryDatabaseProvider(redis);

  context.InMemoryDatabaseProvider = inMemoryDatabaseProvider;
  context.RedisInMemoryDatabaseProvider = redis;

  context.container.registerInstance<IInMemoryDatabaseProvider>(
    "InMemoryDatabaseProvider",
    inMemoryDatabaseProvider,
  );

  await inMemoryDatabaseProvider.initialization;
};

const disposeInMemoryDatabaseProvider = async (context: TestContext) => {
  const redis = context.RedisInMemoryDatabaseProvider;
  await redis?.provider.del("*");
};

beforeEach(async context => {
  context.container = mainContainer;
  context.container.reset();

  await Promise.all([
    initRelationalDatabase(context),
    initNonRelationalDatabase(context),
    initInMemoryDatabaseProvider(context),
  ]);

  await initRepositories(context.container);

  context.repositories = Object.keys(repositories).reduce(
    (acc, token) => {
      acc[token as RepositoryToken] = context.container.resolve(token);
      return acc;
    },
    {} as TestContext["repositories"],
  );
});

afterEach(async context => {
  await sleep(1000);
  await Promise.all([
    disposeRelationalDatabase(context),
    disposeNonRelationalDatabase(context),
    disposeInMemoryDatabaseProvider(context),
  ]);
});
