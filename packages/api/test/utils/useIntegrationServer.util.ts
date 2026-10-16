import { randomUUID } from "node:crypto";
import { addHours } from "date-fns";
import request from "supertest";
import { afterEach, beforeEach, vi } from "vitest";

// Configuration import
import { createAuthenticationMethodMock } from "@/test/config/integration/globalMocks";
import { getEnvConfig } from "@config/env";

// Error import
import { AppError } from "@shared/errors/AppError";

// Container import
import { initSecondaryProviders } from "@shared/container";

// Provider import
import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { IEmailNotificationProvider } from "@shared/container/providers/EmailNotificationProvider/models/IEmailNotification.provider";
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Util import
import { disposeServer, getServer } from "./getServer.util";
import type { IFirebaseSessionDTO } from "./startAndGetSessionToken.util";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Factory import
import { fileFactory } from "@modules/file/entities/factories/file.factory";

const createSession = (email: string): IFirebaseSessionDTO => ({
  idToken: randomUUID(),
  localId: randomUUID(),
  refreshToken: randomUUID(),
  email,
  displayName: null,
});

const createSessionAuthenticationMethod = (
  sessions: IFirebaseSessionDTO[],
): IAuthenticationMethod => {
  const findSession = async (access_token: string) => {
    const session = sessions.find(({ idToken }) => idToken === access_token);

    if (!session)
      throw new AppError({
        key: "@firebase_authentication_provider_verify_access_token/INVALID_TOKEN",
        message: "Invalid or expired token.",
        statusCode: 401,
      });

    return session;
  };

  const authenticationMethod: IAuthenticationMethod = {
    ...createAuthenticationMethodMock(),
    verifyAccessToken: async ({ access_token }) => {
      const session = await findSession(access_token);

      return {
        access_token,
        access_token_expires_at: addHours(new Date(), 1),
        user_code: session.localId,
        auth_provider: AUTH_PROVIDER.FIREBASE,
        payload: {},
      };
    },
    getUserByAuthProviderSession: async ({ access_token }) => {
      const session = await findSession(access_token);

      return {
        code: session.localId,
        email: session.email,
        name: session.displayName,
        auth_provider: AUTH_PROVIDER.FIREBASE,
      };
    },
  };

  return authenticationMethod;
};

export const useIntegrationServer = () => {
  beforeEach(async context => {
    initSecondaryProviders(context.container);

    context.container.registerInstance<IEmailNotificationProvider>(
      "EmailNotificationProvider",
      {
        initialization: Promise.resolve(),
        send: vi.fn(async () => undefined),
      },
    );

    const storageProvider: IStorageProvider = {
      provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      initialization: Promise.resolve(),
      generateUploadSignedUrl: vi.fn(async () => fileFactory.create()),
      refreshFile: vi.fn(async ({ file }) => file),
      removeFileByPath: vi.fn(async () => ""),
    };
    context.container.registerInstance<IStorageProvider>(
      "StorageProvider",
      storageProvider,
    );

    const jobProvider: IJobProvider = {
      initialization: Promise.resolve(),
      add: vi.fn(),
      close: vi.fn(async () => undefined),
    };
    context.container.registerInstance<IJobProvider>(
      "JobProvider",
      jobProvider,
    );

    const config = getEnvConfig();
    const userSession = createSession(config.TESTING_USER_EMAIL!);
    const adminSession = createSession(config.TESTING_ADMIN_EMAIL!);

    const authenticationMethod = createSessionAuthenticationMethod([
      userSession,
      adminSession,
    ]);
    context.container.registerInstance<IAuthenticationProvider>(
      "AuthenticationProvider",
      {
        default_auth_provider: AUTH_PROVIDER.FIREBASE,
        initialization: Promise.resolve(),
        getProvider: async () => authenticationMethod,
        dispose: async () => undefined,
      },
    );

    context.authenticationMethod = authenticationMethod;

    context.app = await getServer();

    context.request = request(context.app.express);
    context.gql = request(context.app.express).post("/graphql");

    context.userSession = userSession;
    context.adminSession = adminSession;

    context.userAuthorized = arg =>
      arg.set("authorization", `Bearer ${userSession.idToken}`);
    context.adminAuthorized = arg =>
      arg.set("authorization", `Bearer ${adminSession.idToken}`);
  });

  afterEach(async context => {
    await disposeServer(context.app);
  });
};
