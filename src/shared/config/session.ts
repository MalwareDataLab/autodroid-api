import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import { logger } from "@shared/utils/logger";
import { RedisStore } from "connect-redis";
import session from "express-session";
import { container } from "tsyringe";

const getSessionConfig = (): session.SessionOptions => {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const getMainDomain = (): string | undefined => {
    if (process.env.NODE_ENV !== "production") {
      return undefined;
    }

    const { APP_URL } = process.env;
    if (!APP_URL) {
      return undefined;
    }

    try {
      const { hostname } = new URL(APP_URL);

      const parts = hostname.split(".");
      if (parts.length >= 2) {
        return `.${parts.slice(-2).join(".")}`;
      }

      return `.${hostname}`;
    } catch (error) {
      logger.warn(`Failed to parse APP_URL for session domain: ${APP_URL}`);
      return undefined;
    }
  };

  const redisStore = new RedisStore({
    client: container.resolve<IInMemoryDatabaseProvider>(
      "InMemoryDatabaseProvider",
    ).connection,
    prefix: "session:",
  });

  return {
    name: "session",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none" as const,
      domain: getMainDomain(),
    },
    store: redisStore,
  };
};

export { getSessionConfig };
