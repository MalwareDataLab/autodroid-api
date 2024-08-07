import * as Sentry from "@sentry/node";

// Error import
import { AppError } from "@shared/errors/AppError";

// Args import
import { argv } from "@shared/infrastructure/app";

// Configuration import
import { getEnvConfig } from "@config/env";

const getSentryConfig: () => Sentry.NodeOptions = () => {
  const envConfig = getEnvConfig();

  return {
    dsn: envConfig.SENTRY_DSN,
    environment: argv.env || process.env.NODE_ENV,
    release: envConfig.APP_INFO.version,
    tracesSampleRate: 1.0,
    beforeSend(event: any) {
      if (
        (event.statusCode && Number(event.statusCode) >= 500) ||
        (event instanceof AppError && !!event.debug)
      )
        return event;
      return null;
    },
  };
};

export { getSentryConfig };
