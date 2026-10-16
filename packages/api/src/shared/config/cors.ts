import { CorsOptions, CorsOptionsDelegate } from "cors";

// Configuration import
import { getEnvConfig } from "@config/env";

const getCorsConfig = (): CorsOptions => {
  const envConfig = getEnvConfig();

  return {
    origin:
      envConfig.NODE_ENV === "production"
        ? envConfig.CORS_ALLOWED_FROM.split(",")
        : "*",
    credentials: true,
    exposedHeaders: ["WWW-Authenticate"],
  };
};

const PUBLIC_OAUTH_PATH_PATTERN = /^\/(\.well-known|oauth)\//;

const getCorsOptionsDelegate = (): CorsOptionsDelegate => (req, callback) => {
  const path = ((req as { url?: string }).url ?? "").split("?")[0];

  callback(
    null,
    PUBLIC_OAUTH_PATH_PATTERN.test(path) ? { origin: "*" } : getCorsConfig(),
  );
};

export { getCorsConfig, getCorsOptionsDelegate };
