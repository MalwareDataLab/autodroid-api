// Configuration import
import { getEnvConfig } from "@config/env";

const getGoogleStorageProviderConfig = () => {
  const envConfig = getEnvConfig();

  return {
    project_id: String(envConfig.GOOGLE_STORAGE_PROVIDER_PROJECT_ID),
    client_email: String(envConfig.GOOGLE_STORAGE_PROVIDER_CLIENT_EMAIL),
    bucket_name: String(envConfig.GOOGLE_STORAGE_PROVIDER_BUCKET_NAME),
    private_key: String(envConfig.GOOGLE_STORAGE_PROVIDER_PRIVATE_KEY).replace(
      /\\n/g,
      "\n",
    ),
  };
};

export { getGoogleStorageProviderConfig };
