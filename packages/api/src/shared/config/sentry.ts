import * as Sentry from "@sentry/node";

// Configuration import
import { getEnvConfig } from "@config/env";

// Error import
import { AppError } from "@shared/errors/AppError";

const getSentryConfig: () => Sentry.NodeOptions = () => {
  const envConfig = getEnvConfig();

  return {
    dsn: envConfig.SENTRY_DSN,
    environment: envConfig.APP_ENV || process.env.NODE_ENV,
    release: envConfig.APP_INFO.version,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    beforeSend(event, hint) {
      const error = hint?.originalException as any;
      if (!error) return event;

      if (error instanceof AppError && (!error.debug || error.statusCode < 500))
        return null;

      return event;
    },
  };
};

export { getSentryConfig };
