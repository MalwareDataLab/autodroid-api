import { isNumberString } from "class-validator";

// Configuration import
import { getEnvConfig } from "@config/env";

const getWorkerConfig = () => {
  const envConfig = getEnvConfig();

  return {
    worker_refresh_token_secret: envConfig.WORKER_REFRESH_TOKEN_SECRET,
    worker_refresh_token_expiration: envConfig.WORKER_REFRESH_TOKEN_EXPIRATION,
    worker_refresh_token_audience: "worker-refresh-token",
    worker_access_token_secret: envConfig.WORKER_ACCESS_TOKEN_SECRET,
    worker_access_token_expiration: envConfig.WORKER_ACCESS_TOKEN_EXPIRATION,
    worker_access_token_audience: "worker-access-token",
    worker_max_concurrent_jobs: isNumberString(
      envConfig.WORKER_MAX_CONCURRENT_JOBS,
    )
      ? Number(envConfig.WORKER_MAX_CONCURRENT_JOBS)
      : 1,
  };
};

export { getWorkerConfig };
