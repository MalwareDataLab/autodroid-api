import ms from "ms";

// Configuration import
import { getEnvConfig } from "@config/env";

const getMillisecondConfig = () => {
  const envConfig = getEnvConfig();

  return {
    STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION: ms(
      envConfig.STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION || "1d",
    ),

    STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION: ms(
      envConfig.STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION || "5m",
    ),

    PROCESSING_DEFAULT_KEEP_UNTIL: ms(
      envConfig.PROCESSING_DEFAULT_KEEP_UNTIL || "30",
    ),

    PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND: ms(
      envConfig.PROCESSING_ALLOWED_KEEP_UNTIL_EXTEND || "30",
    ),
  };
};

export { getMillisecondConfig };
