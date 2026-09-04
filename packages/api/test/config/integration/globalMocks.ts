import { container } from "tsyringe";
import { vi } from "vitest";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";
import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

const setupGlobalMocks = () => {
  container.registerInstance<IStorageProvider>("StorageProvider", {
    provider_code: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
    initialization: Promise.resolve(),
    generateUploadSignedUrl: vi.fn(() => {
      throw new Error("Not implemented.");
    }),
    refreshFile: vi.fn(({ file }) => file),
    removeFileByPath: vi.fn(),
  });

  container.registerInstance<IJobProvider>("JobProvider", {
    initialization: Promise.resolve(),
    add: vi.fn(),
    close: vi.fn(async () => undefined),
  });

  const notImplemented = () => {
    throw new Error("Not implemented.");
  };

  const authenticationMethod: IAuthenticationMethod = {
    auth_provider: AUTH_PROVIDER.FIREBASE,
    initialization: Promise.resolve(),
    verifyAccessToken: vi.fn(notImplemented),
    createUserTokenByCode: vi.fn(notImplemented),
    revokeTokens: vi.fn(async () => undefined),
    createUser: vi.fn(notImplemented),
    getUserByAuthProviderSession: vi.fn(notImplemented),
    getUserByCode: vi.fn(notImplemented),
    getUserByEmail: vi.fn(notImplemented),
    getUserByPhoneNumber: vi.fn(notImplemented),
    updateUserByCode: vi.fn(notImplemented),
    deleteUserByCode: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
  };

  container.registerInstance<IAuthenticationProvider>(
    "AuthenticationProvider",
    {
      default_auth_provider: AUTH_PROVIDER.FIREBASE,
      initialization: Promise.resolve(),
      getProvider: vi.fn(async () => authenticationMethod),
      dispose: vi.fn(async () => undefined),
    },
  );
};

export { setupGlobalMocks };
