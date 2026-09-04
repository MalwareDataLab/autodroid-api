// Session import
import { getValidSession } from "./auth/firebaseSession";
import { readSession, writeSession } from "./auth/sessionStore";

interface ICliConfig {
  endpoint: string;
  apiKey: string;
}

const getCliConfig = (): ICliConfig => {
  const endpoint = process.env.AUTODROID_CLI_API_URL;
  const apiKey = process.env.AUTODROID_CLI_FIREBASE_WEB_API_KEY;

  if (!endpoint) throw new Error("AUTODROID_CLI_API_URL is required.");
  if (!apiKey)
    throw new Error("AUTODROID_CLI_FIREBASE_WEB_API_KEY is required.");

  return { endpoint, apiKey };
};

const resolveIdToken = async (): Promise<string> => {
  const { apiKey } = getCliConfig();
  const stored = await readSession();

  if (!stored)
    throw new Error("Not authenticated. Run `autodroid login` first.");

  const session = await getValidSession({
    session: stored,
    apiKey,
    now: Date.now(),
  });

  if (session !== stored) await writeSession(session);

  return session.idToken;
};

export { getCliConfig, resolveIdToken };
export type { ICliConfig };
