import "reflect-metadata";

import { beforeEach, describe, expect, it, vi } from "vitest";

// Enum import
import { AUTH_PROVIDER } from "./types/authProvider.enum";

// Target import
import { AuthenticationProvider } from ".";

const firebaseProviderMock = vi.hoisted(() => ({
  initialization: Promise.resolve(),
  resolveInitialization: () => {},
  dispose: vi.fn(),
}));

vi.mock("./implementations", () => ({
  FirebaseAuthenticationProvider: class {
    get initialization() {
      return firebaseProviderMock.initialization;
    }

    dispose = firebaseProviderMock.dispose;
  },
}));

describe("Provider: AuthenticationProvider", () => {
  beforeEach(() => {
    firebaseProviderMock.initialization = new Promise(resolve => {
      firebaseProviderMock.resolveInitialization = resolve;
    });
    firebaseProviderMock.dispose.mockResolvedValue(undefined);
  });

  it("should default to Firebase and be initialized only once Firebase is", async () => {
    const authenticationProvider = new AuthenticationProvider();
    const initialized = vi.fn();
    authenticationProvider.initialization.then(initialized);

    await Promise.resolve();
    expect(initialized).not.toHaveBeenCalled();
    firebaseProviderMock.resolveInitialization();
    await authenticationProvider.initialization;

    expect(authenticationProvider.default_auth_provider).toBe(
      AUTH_PROVIDER.FIREBASE,
    );
    expect(initialized).toHaveBeenCalledOnce();
  });

  it("should hand out the default provider, once it is initialized, when no provider is named", async () => {
    const authenticationProvider = new AuthenticationProvider();
    firebaseProviderMock.resolveInitialization();

    const provider = await authenticationProvider.getProvider();

    expect(provider.initialization).toBe(firebaseProviderMock.initialization);
    expect(provider.dispose).toBe(firebaseProviderMock.dispose);
  });

  it("should hand out the named provider", async () => {
    const authenticationProvider = new AuthenticationProvider();
    firebaseProviderMock.resolveInitialization();

    await expect(
      authenticationProvider.getProvider(AUTH_PROVIDER.FIREBASE, "pt-BR"),
    ).resolves.toBe(await authenticationProvider.getProvider());
  });

  it("should refuse a provider it does not have", async () => {
    const authenticationProvider = new AuthenticationProvider();

    await expect(
      authenticationProvider.getProvider("UNKNOWN" as AUTH_PROVIDER),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@authentication_provider/INVALID_PROVIDER",
        message: "Invalid authentication provider.",
        statusCode: 500,
        debug: expect.objectContaining({ code: "UNKNOWN" }),
      }),
    );
  });

  it("should dispose every provider it holds", async () => {
    const authenticationProvider = new AuthenticationProvider();

    await authenticationProvider.dispose();

    expect(firebaseProviderMock.dispose).toHaveBeenCalledOnce();
  });
});
