// Configuration import
import { getEnvConfig } from "@config/env";

const getAuthConfig = () => {
  const envConfig = getEnvConfig();

  return {
    worker_refresh_token_secret: envConfig.WORKER_REFRESH_TOKEN_SECRET,
    worker_refresh_token_expiration: envConfig.WORKER_REFRESH_TOKEN_EXPIRATION,
    worker_refresh_token_audience: "worker-refresh-token",
    worker_access_token_secret: envConfig.WORKER_ACCESS_TOKEN_SECRET,
    worker_access_token_expiration: envConfig.WORKER_ACCESS_TOKEN_EXPIRATION,
    worker_access_token_audience: "worker-access-token",
  };
};

export { getAuthConfig };
