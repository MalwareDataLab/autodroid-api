import { randomUUID } from "node:crypto";
import { DependencyContainer } from "tsyringe";

// Provider import
import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Util import
import type { IFirebaseSessionDTO } from "./startAndGetSessionToken.util";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

interface IDisposableFirebaseSession {
  session: IFirebaseSessionDTO;
  authenticationMethod: IAuthenticationMethod;
  dispose: () => Promise<void>;
}

export const createDisposableFirebaseSession = async (
  container: DependencyContainer,
  name: string,
): Promise<IDisposableFirebaseSession> => {
  const authenticationMethod = await container
    .resolve<IAuthenticationProvider>("AuthenticationProvider")
    .getProvider(AUTH_PROVIDER.FIREBASE, "en");

  const email = `e2e-${randomUUID()}@autodroid.test`;
  const password = randomUUID();

  const user = await authenticationMethod.createUser(
    { name, email, email_verified: true, password },
    "en",
  );

  const dispose = () => authenticationMethod.deleteUserByCode(user.code, "en");

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.TESTING_FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const data = await response.json();

    if (!data.idToken)
      throw new Error(`Fail to start session. ${JSON.stringify(data)}`);

    return {
      session: {
        idToken: data.idToken,
        localId: user.code,
        refreshToken: data.refreshToken,
        email,
        displayName: name,
      },
      authenticationMethod,
      dispose,
    };
  } catch (error) {
    await dispose();
    throw error;
  }
};
