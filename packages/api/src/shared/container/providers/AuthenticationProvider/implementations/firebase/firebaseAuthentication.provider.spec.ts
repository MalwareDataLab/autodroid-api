import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getFirebaseAuthProviderConfig } from "@config/firebase";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Provider import
import { FirebaseAuthenticationProvider } from "./firebaseAuthentication.provider";

const { authMock, appMock, initializeAppMock, certMock } = vi.hoisted(() => {
  const authMockValue = {
    verifyIdToken: vi.fn(),
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByPhoneNumber: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    createCustomToken: vi.fn(),
    revokeRefreshTokens: vi.fn(),
  };
  const appMockValue = {
    auth: vi.fn(() => authMockValue),
    delete: vi.fn(),
  };
  const initializeAppMockValue = vi.fn((...args: unknown[]) => {
    if (args.length === 0) throw new Error("default app already exists");
    return appMockValue;
  });
  const certMockValue = vi.fn(() => ({ __credential: true }));
  return {
    authMock: authMockValue,
    appMock: appMockValue,
    initializeAppMock: initializeAppMockValue,
    certMock: certMockValue,
  };
});

vi.mock("firebase-admin", () => ({
  default: {
    initializeApp: initializeAppMock,
    credential: { cert: certMock },
  },
}));

vi.mock("@config/firebase", () => ({
  getFirebaseAuthProviderConfig: vi.fn(),
}));

const FUTURE_EXP = 4102444800;
const PAST_EXP = 946684800;

describe("Provider: FirebaseAuthenticationProvider", () => {
  const mockGetConfig = vi.mocked(getFirebaseAuthProviderConfig);

  const validConfig = {
    project_id: "proj-id",
    client_email: "svc@proj.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----",
  };

  const buildProvider = async (): Promise<FirebaseAuthenticationProvider> => {
    const provider = new FirebaseAuthenticationProvider();
    await provider.initialization;
    return provider;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(validConfig);
    initializeAppMock.mockImplementation((...args: unknown[]) => {
      if (args.length === 0) throw new Error("default app already exists");
      return appMock;
    });
    appMock.auth.mockImplementation(() => authMock);
    certMock.mockImplementation(() => ({ __credential: true }));
  });

  describe("initialization / getProvider", () => {
    it("should initialize the firebase app with the mapped credential", async () => {
      await buildProvider();

      expect(certMock).toHaveBeenCalledWith({
        projectId: validConfig.project_id,
        clientEmail: validConfig.client_email,
        privateKey: validConfig.private_key,
      });
      expect(initializeAppMock).toHaveBeenCalledWith(
        { credential: { __credential: true } },
        `${AUTH_PROVIDER.FIREBASE}_auth`,
      );
    });

    it("should reuse the already-created client on subsequent calls", async () => {
      const provider = await buildProvider();
      const namedInitCalls = initializeAppMock.mock.calls.filter(
        call => call.length > 0,
      ).length;

      authMock.getUser.mockResolvedValue({ uid: "u1", email: "a@b.com" });
      await provider.getUserByCode("u1", "en");

      const namedInitCallsAfter = initializeAppMock.mock.calls.filter(
        call => call.length > 0,
      ).length;
      expect(namedInitCallsAfter).toBe(namedInitCalls);
    });

    it("should throw INVALID_CONFIGURATION when project_id is missing", async () => {
      mockGetConfig.mockReturnValue({ ...validConfig, project_id: "" });
      const provider = new FirebaseAuthenticationProvider();
      provider.initialization.catch(() => undefined);

      await expect(provider.getUserByCode("u1", "en")).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_provider/INVALID_CONFIGURATION",
        }),
      );
    });

    it("should throw INVALID_CONFIGURATION when client_email is missing", async () => {
      mockGetConfig.mockReturnValue({ ...validConfig, client_email: "" });
      const provider = new FirebaseAuthenticationProvider();
      provider.initialization.catch(() => undefined);

      await expect(provider.getUserByCode("u1", "en")).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_provider/INVALID_CONFIGURATION",
        }),
      );
    });

    it("should throw INVALID_CONFIGURATION when private_key is missing", async () => {
      mockGetConfig.mockReturnValue({ ...validConfig, private_key: "" });
      const provider = new FirebaseAuthenticationProvider();
      provider.initialization.catch(() => undefined);

      await expect(provider.getUserByCode("u1", "en")).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_provider/INVALID_CONFIGURATION",
        }),
      );
    });
  });

  describe("verifyAccessToken", () => {
    it("should return a session mapping the payload", async () => {
      const provider = await buildProvider();

      authMock.verifyIdToken.mockResolvedValue({
        uid: "uid-1",
        exp: FUTURE_EXP,
        payload: { role: "admin" },
      });

      const result = await provider.verifyAccessToken({
        access_token: "token-123",
        language: "en",
      });

      expect(authMock.verifyIdToken).toHaveBeenCalledWith("token-123", true);
      expect(result).toMatchObject({
        access_token: "token-123",
        access_token_expires_at: new Date(FUTURE_EXP * 1000),
        refresh_token: undefined,
        refresh_token_expires_at: undefined,
        user_code: "uid-1",
        auth_provider: AUTH_PROVIDER.FIREBASE,
        payload: { role: "admin" },
      });
    });

    it("should default the payload to an empty object", async () => {
      const provider = await buildProvider();

      authMock.verifyIdToken.mockResolvedValue({
        uid: "uid-1",
        exp: FUTURE_EXP,
      });

      const result = await provider.verifyAccessToken({
        access_token: "token-123",
        language: "en",
      });

      expect(result.payload).toEqual({});
    });

    it("should throw INVALID_PROVIDER_RESPONSE when uid is missing", async () => {
      const provider = await buildProvider();

      authMock.verifyIdToken.mockResolvedValue({ exp: FUTURE_EXP });

      await expect(
        provider.verifyAccessToken({
          access_token: "token-123",
          language: "en",
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_verify_access_token/INVALID_PROVIDER_RESPONSE",
        }),
      );
    });

    it("should wrap unexpected verification errors as INVALID_TOKEN", async () => {
      const provider = await buildProvider();

      authMock.verifyIdToken.mockRejectedValue(new Error("bad token"));

      await expect(
        provider.verifyAccessToken({
          access_token: "token-123",
          language: "en",
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_verify_access_token/INVALID_TOKEN",
        }),
      );
    });

    it("should not use the past expiration value to alter the token key", async () => {
      const provider = await buildProvider();

      authMock.verifyIdToken.mockResolvedValue({
        uid: "uid-1",
        exp: PAST_EXP,
      });

      const result = await provider.verifyAccessToken({
        access_token: "token-123",
        language: "en",
      });

      expect(result.access_token_expires_at).toEqual(new Date(PAST_EXP * 1000));
    });
  });

  describe("createUser", () => {
    it("should create a user mapping every field", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockRejectedValue(new Error("not found"));
      authMock.getUserByPhoneNumber.mockRejectedValue(new Error("not found"));
      authMock.createUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
        displayName: "John",
        phoneNumber: "+15551234567",
        photoURL: "http://pic/john.png",
      });

      const result = await provider.createUser(
        {
          name: "John",
          email: "john@example.com",
          email_verified: true,
          phone_number: "+15551234567",
          photo_url: "http://pic/john.png",
          password: "s3cret",
        },
        "en",
      );

      expect(authMock.createUser).toHaveBeenCalledWith({
        displayName: "John",
        email: "john@example.com",
        emailVerified: true,
        phoneNumber: "+15551234567",
        photoURL: "http://pic/john.png",
        password: "s3cret",
      });
      expect(result).toMatchObject({
        code: "uid-1",
        name: "John",
        email: "john@example.com",
        phone_number: "+15551234567",
        photo_url: "http://pic/john.png",
        auth_provider: AUTH_PROVIDER.FIREBASE,
      });
    });

    it("should default optional fields when values are falsy", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockResolvedValue(null);
      authMock.createUser.mockResolvedValue({
        uid: "uid-2",
        email: "min@example.com",
      });

      const result = await provider.createUser(
        {
          name: null,
          email: "min@example.com",
          email_verified: false,
          phone_number: null,
          photo_url: null,
        },
        "en",
      );

      expect(authMock.createUser).toHaveBeenCalledWith({
        displayName: undefined,
        email: "min@example.com",
        emailVerified: false,
        phoneNumber: undefined,
        photoURL: undefined,
        password: undefined,
      });
      expect(authMock.getUserByPhoneNumber).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        code: "uid-2",
        name: "",
        email: "min@example.com",
        phone_number: "",
        photo_url: "",
      });
    });

    it("should throw USER_ALREADY_EXISTS when the email is taken", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockResolvedValue({
        uid: "existing",
        email: "taken@example.com",
      });

      await expect(
        provider.createUser({ email: "taken@example.com" }, "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_create_user/USER_ALREADY_EXISTS",
        }),
      );
      expect(authMock.createUser).not.toHaveBeenCalled();
    });

    it("should throw USER_ALREADY_EXISTS when the phone number is taken", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockRejectedValue(new Error("not found"));
      authMock.getUserByPhoneNumber.mockResolvedValue({
        uid: "existing",
        email: "other@example.com",
        phoneNumber: "+15550000000",
      });

      await expect(
        provider.createUser(
          { email: "new@example.com", phone_number: "+15550000000" },
          "en",
        ),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_create_user/USER_ALREADY_EXISTS",
        }),
      );
    });

    it("should throw INVALID_PROVIDER_RESPONSE when uid is missing", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockRejectedValue(new Error("not found"));
      authMock.createUser.mockResolvedValue({ email: "john@example.com" });

      await expect(
        provider.createUser({ email: "john@example.com" }, "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_create_user/INVALID_PROVIDER_RESPONSE",
        }),
      );
    });

    it("should throw INVALID_PROVIDER_RESPONSE when email is missing", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockRejectedValue(new Error("not found"));
      authMock.createUser.mockResolvedValue({ uid: "uid-3" });

      await expect(
        provider.createUser({ email: "john@example.com" }, "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_create_user/INVALID_PROVIDER_RESPONSE",
        }),
      );
    });

    it("should wrap unexpected provider errors in INVALID_RESPONSE", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockRejectedValue(new Error("not found"));
      authMock.createUser.mockRejectedValue(new Error("boom"));

      await expect(
        provider.createUser({ email: "john@example.com" }, "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_create_user/INVALID_RESPONSE",
        }),
      );
    });
  });

  describe("createUserTokenByCode", () => {
    it("should create a custom token for the resolved user", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
      });
      authMock.createCustomToken.mockResolvedValue("custom-token");

      const result = await provider.createUserTokenByCode({
        code: "uid-1",
        payload: { role: "admin" },
        language: "en",
      });

      expect(authMock.createCustomToken).toHaveBeenCalledWith("uid-1", {
        role: "admin",
      });
      expect(result).toBe("custom-token");
    });

    it("should wrap unexpected errors as ERROR", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
      });
      authMock.createCustomToken.mockRejectedValue(new Error("boom"));

      await expect(
        provider.createUserTokenByCode({ code: "uid-1", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_create_user_session/ERROR",
        }),
      );
    });

    it("should rethrow AppErrors raised during token creation", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
      });
      authMock.createCustomToken.mockRejectedValue(
        new AppError({ key: "@some/APP_ERROR", message: "app error" }),
      );

      await expect(
        provider.createUserTokenByCode({ code: "uid-1", language: "en" }),
      ).rejects.toThrowError(
        expect.objectContaining({ key: "@some/APP_ERROR" }),
      );
    });
  });

  describe("getUserByAuthProviderSession", () => {
    it("should verify the token then resolve the user by code", async () => {
      const provider = await buildProvider();

      authMock.verifyIdToken.mockResolvedValue({
        uid: "uid-1",
        exp: FUTURE_EXP,
      });
      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
        displayName: "John",
      });

      const result = await provider.getUserByAuthProviderSession(
        {
          access_token: "token-123",
          access_token_expires_at: new Date(FUTURE_EXP * 1000),
          user_code: "uid-1",
          payload: {},
          auth_provider: AUTH_PROVIDER.FIREBASE,
        },
        "en",
      );

      expect(authMock.getUser).toHaveBeenCalledWith("uid-1");
      expect(result).toMatchObject({
        code: "uid-1",
        email: "john@example.com",
        name: "John",
      });
    });
  });

  describe("getUserByCode", () => {
    it("should map a found user including password data", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
        displayName: "John",
        phoneNumber: "+15551234567",
        photoURL: "http://pic/john.png",
        passwordHash: "hash",
        passwordSalt: "salt",
      });

      const result = await provider.getUserByCode("uid-1", "en");

      expect(authMock.getUser).toHaveBeenCalledWith("uid-1");
      expect(result).toMatchObject({
        code: "uid-1",
        name: "John",
        email: "john@example.com",
        phone_number: "+15551234567",
        photo_url: "http://pic/john.png",
        password_hash: "hash",
        password_salt: "salt",
      });
    });

    it("should default optional fields when they are absent", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({ uid: "uid-1" });

      const result = await provider.getUserByCode("uid-1", "en");

      expect(result).toMatchObject({
        code: "uid-1",
        name: "",
        email: "",
        phone_number: "",
        photo_url: "",
        password_hash: undefined,
        password_salt: undefined,
      });
    });

    it("should throw USER_NOT_FOUND when the provider returns nothing", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue(undefined);

      await expect(provider.getUserByCode("uid-1", "en")).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_code/USER_NOT_FOUND",
        }),
      );
    });

    it("should wrap unexpected errors as CANNOT_GET", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockRejectedValue(new Error("boom"));

      await expect(provider.getUserByCode("uid-1", "en")).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_code/CANNOT_GET",
        }),
      );
    });
  });

  describe("getUserByEmail", () => {
    it("should map a found user", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
        displayName: "John",
        phoneNumber: "+15551234567",
        photoURL: "http://pic/john.png",
      });

      const result = await provider.getUserByEmail("john@example.com", "en");

      expect(authMock.getUserByEmail).toHaveBeenCalledWith("john@example.com");
      expect(result).toMatchObject({
        code: "uid-1",
        name: "John",
        email: "john@example.com",
      });
    });

    it("should default optional fields when they are absent", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockResolvedValue({ uid: "uid-1" });

      const result = await provider.getUserByEmail("john@example.com", "en");

      expect(result).toMatchObject({
        code: "uid-1",
        name: "",
        email: "",
        phone_number: "",
        photo_url: "",
      });
    });

    it("should throw USER_NOT_FOUND when the provider returns nothing", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockResolvedValue(undefined);

      await expect(
        provider.getUserByEmail("john@example.com", "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_email/USER_NOT_FOUND",
        }),
      );
    });

    it("should wrap unexpected errors as CANNOT_GET", async () => {
      const provider = await buildProvider();

      authMock.getUserByEmail.mockRejectedValue(new Error("boom"));

      await expect(
        provider.getUserByEmail("john@example.com", "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_email/CANNOT_GET",
        }),
      );
    });
  });

  describe("getUserByPhoneNumber", () => {
    it("should map a found user", async () => {
      const provider = await buildProvider();

      authMock.getUserByPhoneNumber.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
        displayName: "John",
        phoneNumber: "+15551234567",
        photoURL: "http://pic/john.png",
      });

      const result = await provider.getUserByPhoneNumber("+15551234567", "en");

      expect(authMock.getUserByPhoneNumber).toHaveBeenCalledWith(
        "+15551234567",
      );
      expect(result).toMatchObject({
        code: "uid-1",
        name: "John",
        phone_number: "+15551234567",
      });
    });

    it("should default optional fields when they are absent", async () => {
      const provider = await buildProvider();

      authMock.getUserByPhoneNumber.mockResolvedValue({ uid: "uid-1" });

      const result = await provider.getUserByPhoneNumber("+15551234567", "en");

      expect(result).toMatchObject({
        code: "uid-1",
        name: "",
        email: "",
        phone_number: "",
        photo_url: "",
      });
    });

    it("should throw USER_NOT_FOUND when the provider returns nothing", async () => {
      const provider = await buildProvider();

      authMock.getUserByPhoneNumber.mockResolvedValue(undefined);

      await expect(
        provider.getUserByPhoneNumber("+15551234567", "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_phone_number/USER_NOT_FOUND",
        }),
      );
    });

    it("should wrap unexpected errors as CANNOT_GET", async () => {
      const provider = await buildProvider();

      authMock.getUserByPhoneNumber.mockRejectedValue(new Error("boom"));

      await expect(
        provider.getUserByPhoneNumber("+15551234567", "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_phone_number/CANNOT_GET",
        }),
      );
    });
  });

  describe("updateUserByCode", () => {
    const currentUser = {
      uid: "uid-1",
      email: "current@example.com",
      displayName: "Current",
    };

    it("should update a user mapping every field", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue(currentUser);
      authMock.updateUser.mockResolvedValue({
        uid: "uid-1",
        email: "next@example.com",
        displayName: "Next",
        phoneNumber: "+15552222222",
        photoURL: "http://pic/next.png",
      });

      const result = await provider.updateUserByCode(
        "uid-1",
        {
          name: "Next",
          email: "next@example.com",
          phone_number: "+15552222222",
          photo_url: "http://pic/next.png",
          email_verified: true,
          password: "newpass",
        },
        "en",
      );

      expect(authMock.updateUser).toHaveBeenCalledWith("uid-1", {
        displayName: "Next",
        email: "next@example.com",
        phoneNumber: "+15552222222",
        photoURL: "http://pic/next.png",
        emailVerified: true,
        password: "newpass",
      });
      expect(result).toMatchObject({
        code: "uid-1",
        name: "Next",
        email: "next@example.com",
      });
    });

    it("should default optional fields when the response is sparse", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue(currentUser);
      authMock.updateUser.mockResolvedValue({ uid: "uid-1" });

      const result = await provider.updateUserByCode(
        "uid-1",
        { name: "OnlyName" },
        "en",
      );

      expect(result).toMatchObject({
        code: "uid-1",
        name: "",
        email: "",
        phone_number: "",
        photo_url: "",
      });
    });

    it("should rethrow AppErrors raised while resolving the user", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue(undefined);

      await expect(
        provider.updateUserByCode("uid-1", { name: "x" }, "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_code/USER_NOT_FOUND",
        }),
      );
    });

    it("should wrap unexpected errors as CANNOT_UPDATE", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue(currentUser);
      authMock.updateUser.mockRejectedValue(new Error("update failed"));

      await expect(
        provider.updateUserByCode("uid-1", { name: "x" }, "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_update_user_by_code/CANNOT_UPDATE",
        }),
      );
    });
  });

  describe("deleteUserByCode", () => {
    it("should delete the resolved user", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
      });
      authMock.deleteUser.mockResolvedValue(undefined);

      await provider.deleteUserByCode("uid-1", "en");

      expect(authMock.deleteUser).toHaveBeenCalledWith("uid-1");
    });

    it("should rethrow AppErrors raised while resolving the user", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue(undefined);

      await expect(
        provider.deleteUserByCode("uid-1", "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_get_user_by_code/USER_NOT_FOUND",
        }),
      );
    });

    it("should wrap unexpected errors as CANNOT_DELETE", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
      });
      authMock.deleteUser.mockRejectedValue(new Error("boom"));

      await expect(
        provider.deleteUserByCode("uid-1", "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_delete_user_by_code/CANNOT_DELETE",
        }),
      );
    });
  });

  describe("revokeTokens", () => {
    const buildConn = (
      overrides: Partial<UserAuthProviderConn> = {},
    ): UserAuthProviderConn =>
      parse(UserAuthProviderConn, {
        id: "conn-1",
        auth_provider: AUTH_PROVIDER.FIREBASE,
        code: "uid-1",
        payload: {},
        ...overrides,
      });

    it("should revoke refresh tokens for the resolved user", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
      });
      authMock.revokeRefreshTokens.mockResolvedValue(undefined);

      await provider.revokeTokens(buildConn(), "en");

      expect(authMock.revokeRefreshTokens).toHaveBeenCalledWith("uid-1");
    });

    it("should throw INVALID_PROVIDER when the connection provider mismatches", async () => {
      const provider = await buildProvider();

      const conn = buildConn({
        auth_provider: "OTHER" as AUTH_PROVIDER,
      });

      await expect(provider.revokeTokens(conn, "en")).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_revoke_tokens/INVALID_PROVIDER",
        }),
      );
    });

    it("should wrap unexpected errors as CANNOT_REVOKE", async () => {
      const provider = await buildProvider();

      authMock.getUser.mockResolvedValue({
        uid: "uid-1",
        email: "john@example.com",
      });
      authMock.revokeRefreshTokens.mockRejectedValue(new Error("boom"));

      await expect(
        provider.revokeTokens(buildConn(), "en"),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@firebase_authentication_provider_revoke_tokens/CANNOT_REVOKE",
        }),
      );
    });
  });

  describe("dispose", () => {
    it("should delete the underlying firebase app", async () => {
      const provider = await buildProvider();

      appMock.delete.mockResolvedValue(undefined);

      await provider.dispose();

      expect(appMock.delete).toHaveBeenCalledOnce();
    });
  });
});
