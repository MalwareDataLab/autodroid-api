// Util import
import { getFirebaseTestCredentials } from "./getFirebaseTestCredentials.util";

export interface IFirebaseSessionDTO {
  idToken: string;
  localId: string;
  refreshToken: string;
  email: string;
  displayName: string | null;
}

export const startAndGetSessionToken = async (
  kind: "USER" | "ADMIN",
): Promise<IFirebaseSessionDTO> => {
  const { email, password } = getFirebaseTestCredentials(kind);

  const body = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
  });

  const testVariables: Record<string, any> = JSON.parse(
    process.env.TEST_VARIABLES || "{}",
  );

  if (testVariables.user_sessions?.[email]?.data?.idToken) {
    if (
      testVariables.user_sessions[email].createdAt + 3600 * 1000 >
      Date.now()
    ) {
      return testVariables.user_sessions[email].data;
    }
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.TESTING_FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      redirect: "follow",
    },
  );

  const data = await res.json();

  if (!data.idToken) {
    throw new Error(`Fail to start session. ${JSON.stringify(data, null, 2)}`);
  }

  const updatedTestVariables = {
    ...testVariables,
    sessions: {
      ...testVariables.user_sessions,
      [email]: {
        createdAt: Date.now(),
        data,
      },
    },
  };

  process.env.TEST_VARIABLES = JSON.stringify(updatedTestVariables);

  return data;
};
