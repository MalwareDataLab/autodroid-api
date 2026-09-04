// Configuration import
import { getEnvConfig } from "./env";

const getFrontendConfig = () => {
  const envConfig = getEnvConfig();

  return {
    FRONTEND_URL: envConfig.FRONTEND_URL,
  };
};

export { getFrontendConfig };
