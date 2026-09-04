// Config import
import { getEnvConfig } from "@config/env";

const getFirebaseTestCredentials = (kind: "USER" | "ADMIN") => {
  const config = getEnvConfig();

  let credentials: { email: string; password: string } | null = null;

  if (kind === "USER")
    credentials = {
      email: config.TESTING_USER_EMAIL!,
      password: config.TESTING_USER_PASSWORD!,
    };

  if (kind === "ADMIN")
    credentials = {
      email: config.TESTING_ADMIN_EMAIL!,
      password: config.TESTING_ADMIN_PASSWORD!,
    };

  if (!credentials || !credentials.email || !credentials.password)
    throw new Error("Firebase credentials not found");

  return credentials;
};

export { getFirebaseTestCredentials };
