import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { faker } from "@faker-js/faker";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Type import
import { ParsedSamlUser } from "@shared/infrastructure/saml/types";

// Provider import
import {
  IAuthenticationMethod,
  IAuthenticationProvider,
} from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Service import
import { HandleSamlToFirebaseAuthenticationService } from "./handleSamlToFirebaseAuthentication.service";

describe("Service: HandleSamlToFirebaseAuthenticationService", () => {
  let authenticationProvider: IAuthenticationProvider;
  let authenticationMethod: IAuthenticationMethod;

  let handleSamlToFirebaseAuthenticationService: HandleSamlToFirebaseAuthenticationService;

  const buildSamlUser = (
    override: Partial<ParsedSamlUser> = {},
  ): ParsedSamlUser => ({
    uid: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.username(),
    nameID: faker.string.uuid(),
    rawClaims: {},
    ...override,
  });

  beforeEach(async () => {
    authenticationProvider = container.resolve("AuthenticationProvider");
    authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );

    handleSamlToFirebaseAuthenticationService =
      new HandleSamlToFirebaseAuthenticationService(authenticationProvider);
  });

  it("should create a token for an existing firebase user", async () => {
    const user = buildSamlUser();
    const code = faker.string.uuid();
    const customToken = faker.string.alphanumeric(30);

    vi.spyOn(authenticationMethod, "getUserByEmail").mockResolvedValueOnce({
      code,
      email: user.email!,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });
    vi.spyOn(
      authenticationMethod,
      "createUserTokenByCode",
    ).mockResolvedValueOnce(customToken);

    const response = await handleSamlToFirebaseAuthenticationService.execute({
      user,
      language: "en",
    });

    expect(response).toEqual({ customToken, firebaseUid: code });
  });

  it("should create the firebase user when it does not exist", async () => {
    const user = buildSamlUser({ firstName: undefined, lastName: undefined });
    const code = faker.string.uuid();
    const customToken = faker.string.alphanumeric(30);

    vi.spyOn(authenticationMethod, "getUserByEmail").mockRejectedValueOnce(
      new Error("not found"),
    );
    vi.spyOn(authenticationMethod, "createUser").mockResolvedValueOnce({
      code,
      email: user.email!,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });
    vi.spyOn(
      authenticationMethod,
      "createUserTokenByCode",
    ).mockResolvedValueOnce(customToken);

    const response = await handleSamlToFirebaseAuthenticationService.execute({
      user,
      language: "en",
    });

    expect(response).toEqual({ customToken, firebaseUid: code });
  });

  it("should throw when the email is missing", async () => {
    const user = buildSamlUser({ email: undefined });

    await expect(() =>
      handleSamlToFirebaseAuthenticationService.execute({
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_saml_to_firebase_authentication_service/EMAIL_REQUIRED",
      }),
    );
  });

  it("should throw when the email is invalid", async () => {
    const user = buildSamlUser({ email: "not-an-email" });

    await expect(() =>
      handleSamlToFirebaseAuthenticationService.execute({
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_saml_to_firebase_authentication_service/EMAIL_REQUIRED",
      }),
    );
  });

  it("should throw FAILED_TO_CREATE_TOKEN when an unexpected error occurs", async () => {
    const user = buildSamlUser();

    vi.spyOn(authenticationMethod, "getUserByEmail").mockResolvedValueOnce({
      code: faker.string.uuid(),
      email: user.email!,
      auth_provider: AUTH_PROVIDER.FIREBASE,
    });
    vi.spyOn(
      authenticationMethod,
      "createUserTokenByCode",
    ).mockRejectedValueOnce(new Error("boom"));

    await expect(() =>
      handleSamlToFirebaseAuthenticationService.execute({
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@handle_saml_to_firebase_authentication_service/FAILED_TO_CREATE_TOKEN",
      }),
    );
  });
});
