import { logger } from "@shared/utils/logger";

const getSessionConfig = (): CookieSessionInterfaces.CookieSessionOptions => {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const keys = [sessionSecret];

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

  return {
    name: "session",
    keys,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    domain: getMainDomain(),
  };
};

export { getSessionConfig };
