import { CorsOptions } from "cors";

// Configuration import
import { getEnvConfig } from "@config/env";

const getCorsConfig = (): CorsOptions => {
  const envConfig = getEnvConfig();

  return {
    origin:
      envConfig.NODE_ENV === "production"
        ? envConfig.CORS_ALLOWED_FROM.split(",")
        : "*",
  };
};

const getSamlCorsConfig = (): CorsOptions => {
  return {
    ...getCorsConfig(),
    credentials: true,
  };
};

export { getCorsConfig, getSamlCorsConfig };
