/* eslint-disable import/first */
import "reflect-metadata";
import dotenv from "dotenv";
import { afterAll, afterEach, beforeAll, beforeEach, inject } from "vitest";
import { randomUUID } from "node:crypto";
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

// Type import
import { TestContext } from "../../types/testContext.type";

// Mock import
import { setupGlobalMocks } from "./globalMocks";

const DATABASE_MANAGEMENT_LOCK = "hashtext('autodroid_test_database')";

let relationalDatabaseUrl: string;
let relationalDatabaseClient: PrismaClient;
let relationalDatabaseProvider: PrismaDatabaseProvider;
let relationalDatabaseTruncateStatement: string;

const executeAdministratorStatement = async (statement: string) => {
  const { administratorUrl } = inject("relationalDatabase");

  const administratorClient = new Client({
    connectionString: administratorUrl,
  });
  await administratorClient.connect();
  try {
    await administratorClient.query(
      `SELECT pg_advisory_lock(${DATABASE_MANAGEMENT_LOCK})`,
    );
    await administratorClient.query(statement);
  } finally {
    await administratorClient.end();
  }
};

const createRelationalDatabase = async () => {
  const { baseUri, template } = inject("relationalDatabase");

  const databaseName = `test_${randomUUID().replace(/-/g, "")}`;
  const url = new URL(baseUri);
  url.pathname = `/${databaseName}`;
  relationalDatabaseUrl = url.toString();

  await executeAdministratorStatement(
    `CREATE DATABASE "${databaseName}" TEMPLATE "${template}"`,
  );

  relationalDatabaseClient = new PrismaClient({
    datasources: {
      db: {
        url: relationalDatabaseUrl,
      },
    },
  });

  relationalDatabaseProvider = new PrismaDatabaseProvider(
    relationalDatabaseClient,
  );

  await relationalDatabaseProvider.initialization;

  const tables = await relationalDatabaseClient.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;

  relationalDatabaseTruncateStatement = `TRUNCATE TABLE ${tables
    .map(({ tablename }) => `"${tablename}"`)
    .join(", ")} RESTART IDENTITY CASCADE`;
};

const initRelationalDatabase = async (context: TestContext) => {
  await relationalDatabaseClient.$executeRawUnsafe(
    relationalDatabaseTruncateStatement,
  );

  context.DatabaseUrl = relationalDatabaseUrl;
  context.DatabaseProvider = relationalDatabaseProvider;
  context.PrismaDatabaseProvider = relationalDatabaseClient;

  context.container.registerInstance<IDatabaseProvider>(
    "DatabaseProvider",
    relationalDatabaseProvider,
  );
};

const disposeRelationalDatabase = async () => {
  await relationalDatabaseClient.$disconnect();

  const databaseName = new URL(relationalDatabaseUrl).pathname.replace("/", "");

  await executeAdministratorStatement(
    `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
  );
};

const initNonRelationalDatabase = async (context: TestContext) => {
  const { baseUri } = inject("nonRelationalDatabase");
  const uri = `${baseUri.split("/test")[0]}/test-${randomUUID()}`;

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
  const { host, port } = inject("inMemoryDatabase");

  const redis = new RedisInMemoryDatabaseProvider(
    "default",
    defaultOptions => ({
      ...defaultOptions,
      host,
      port,
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
  await redis?.provider.quit();
};

beforeAll(createRelationalDatabase);

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

  setupGlobalMocks();
});

afterEach(async context => {
  await Promise.all([
    disposeNonRelationalDatabase(context),
    disposeInMemoryDatabaseProvider(context),
  ]);
});

afterAll(disposeRelationalDatabase);
