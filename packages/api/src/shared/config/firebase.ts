// Configuration import
import { getEnvConfig } from "@config/env";

const getFirebaseAuthProviderConfig = () => {
  const envConfig = getEnvConfig();

  return {
    project_id: String(envConfig.FIREBASE_AUTHENTICATION_PROVIDER_PROJECT_ID),
    client_email: String(
      envConfig.FIREBASE_AUTHENTICATION_PROVIDER_CLIENT_EMAIL,
    ),
    private_key: String(
      envConfig.FIREBASE_AUTHENTICATION_PROVIDER_PRIVATE_KEY,
    ).replace(/\\n/g, "\n"),
  };
};

export { getFirebaseAuthProviderConfig };
