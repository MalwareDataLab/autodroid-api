import dotenv from "dotenv";
import { execSync } from "node:child_process";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  MongoDBContainer,
  StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { startAndGetSessionToken } from "@/test/utils/startAndGetSessionToken.util";

let teardownStarted = false;

let postgreSqlContainer: StartedPostgreSqlContainer | undefined;
let mongoDBContainer: StartedMongoDBContainer | undefined;
let redisContainer: StartedRedisContainer | undefined;

const TEMPLATE_DATABASE = "autodroid_template";

const startPostgreSql = async () => {
  // Durability is worthless for a throwaway container and dominates the cost of
  // the per-test database clone.
  const container = await new PostgreSqlContainer("postgres:14")
    .withDatabase(TEMPLATE_DATABASE)
    .withCommand([
      "postgres",
      "-c",
      "fsync=off",
      "-c",
      "full_page_writes=off",
      "-c",
      "synchronous_commit=off",
    ])
    .start();

  const baseUri = container.getConnectionUri().toString();
  process.env.DATABASE_URL = baseUri;

  // Replay the migrations once against the template; every test then clones it
  // with CREATE DATABASE ... TEMPLATE instead of replaying them again.
  execSync("./node_modules/.bin/prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: baseUri },
  });

  // CREATE DATABASE ... TEMPLATE refuses to run while any session is connected
  // to the source, so make a stray connection impossible rather than unlikely.
  const administratorClient = new Client({
    connectionString: baseUri.replace(`/${TEMPLATE_DATABASE}`, "/postgres"),
  });
  await administratorClient.connect();
  try {
    await administratorClient.query(
      `ALTER DATABASE "${TEMPLATE_DATABASE}" WITH ALLOW_CONNECTIONS false`,
    );
  } finally {
    await administratorClient.end();
  }

  postgreSqlContainer = container;
  return container;
};

const startMongoDb = async () => {
  const container = await new MongoDBContainer("mongo:6").start();
  process.env.NON_RELATIONAL_DATABASE_URL = container
    .getConnectionString()
    .toString();
  mongoDBContainer = container;
  return container;
};

const startRedis = async () => {
  const container = await new RedisContainer("redis:alpine").start();
  process.env.REDIS_HOST = container.getHost().toString();
  process.env.REDIS_PORT = container.getPort().toString();
  process.env.REDIS_USER = "";
  process.env.REDIS_PASS = "";
  process.env.REDIS_DB = "0";
  redisContainer = container;
  return container;
};

// eslint-disable-next-line import/no-default-export
export default async function setup(project: TestProject) {
  dotenv.config({
    path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  });

  const [adminSession, userSession] = await Promise.all([
    startAndGetSessionToken("ADMIN"),
    startAndGetSessionToken("USER"),
  ]);

  project.provide("adminSession", adminSession);
  project.provide("userSession", userSession);

  await Promise.all([startPostgreSql(), startMongoDb(), startRedis()]);

  const administratorUrl = new URL(process.env.DATABASE_URL!);
  administratorUrl.pathname = "/postgres";
  administratorUrl.searchParams.set("connection_limit", "1");

  project.provide("relationalDatabase", {
    baseUri: process.env.DATABASE_URL!,
    administratorUrl: administratorUrl.toString(),
    template: TEMPLATE_DATABASE,
  });

  // Each project runs this setup, so a second run would clobber the first's
  // process.env. Hand the addresses over explicitly instead.
  project.provide("nonRelationalDatabase", {
    baseUri: process.env.NON_RELATIONAL_DATABASE_URL!,
  });

  project.provide("inMemoryDatabase", {
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT),
  });

  return async () => {
    if (teardownStarted) throw new Error("Teardown called twice");
    teardownStarted = true;

    await Promise.all(
      [postgreSqlContainer, mongoDBContainer, redisContainer].map(
        async container => {
          await container?.stop();
        },
      ),
    );
  };
}
