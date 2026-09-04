const IDENTITY_TOOLKIT_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";
const SECURE_TOKEN_URL = "https://securetoken.googleapis.com/v1/token";

const RENEWAL_WINDOW_MILLISECONDS = 5 * 60 * 1000;

interface IFirebaseSession {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

const decodeTokenExpiration = (idToken: string): number => {
  const [, payload] = idToken.split(".");

  if (!payload) throw new Error("Malformed Firebase token.");

  let claims: { exp?: number };

  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Malformed Firebase token.");
  }

  if (typeof claims.exp !== "number")
    throw new Error("Firebase token has no expiration claim.");

  return claims.exp * 1000;
};

const signInWithPassword = async (params: {
  email: string;
  password: string;
  apiKey: string;
}): Promise<IFirebaseSession> => {
  const { email, password, apiKey } = params;

  const response = await fetch(`${IDENTITY_TOOLKIT_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await response.json();

  if (!data.idToken)
    throw new Error(`Firebase sign in failed. ${data.error?.message}`);

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: decodeTokenExpiration(data.idToken),
  };
};

const refreshSession = async (params: {
  refreshToken: string;
  apiKey: string;
}): Promise<IFirebaseSession> => {
  const { refreshToken, apiKey } = params;

  const response = await fetch(`${SECURE_TOKEN_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  const data = await response.json();

  if (!data.id_token)
    throw new Error(`Firebase token refresh failed. ${data.error?.message}`);

  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: decodeTokenExpiration(data.id_token),
  };
};

const getValidSession = async (params: {
  session: IFirebaseSession;
  apiKey: string;
  now: number;
}): Promise<IFirebaseSession> => {
  const { session, apiKey, now } = params;

  if (session.expiresAt - now > RENEWAL_WINDOW_MILLISECONDS) return session;

  return refreshSession({ refreshToken: session.refreshToken, apiKey });
};

export {
  decodeTokenExpiration,
  getValidSession,
  refreshSession,
  signInWithPassword,
};
export type { IFirebaseSession };
