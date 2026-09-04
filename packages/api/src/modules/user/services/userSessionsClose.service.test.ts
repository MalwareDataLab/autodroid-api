import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// Repository import
import { IUserAuthProviderConnRepository } from "../repositories/IUserAuthProviderConn.repository";

// Factory import
import { userFactory } from "../entities/factories/user.factory";

// Service import
import { UserSessionsCloseService } from "./userSessionsClose.service";

describe("Service: UserSessionsCloseService", () => {
  let authenticationProvider: IAuthenticationProvider;
  let userAuthProviderConnRepository: IUserAuthProviderConnRepository;

  let userSessionsCloseService: UserSessionsCloseService;

  beforeEach(() => {
    authenticationProvider = container.resolve("AuthenticationProvider");
    userAuthProviderConnRepository = container.resolve(
      "UserAuthProviderConnRepository",
    );
    userSessionsCloseService = new UserSessionsCloseService(
      authenticationProvider,
      userAuthProviderConnRepository,
    );
  });

  it("should close user sessions", async () => {
    const user = await userFactory.create();
    await userAuthProviderConnRepository.createOne({
      user_id: user.id,
      auth_provider: AUTH_PROVIDER.FIREBASE,
      payload: {},
      code: "code",
    });

    const authenticationMethod = await authenticationProvider.getProvider(
      AUTH_PROVIDER.FIREBASE,
    );
    const revokeTokensSpy = vi.spyOn(authenticationMethod, "revokeTokens");

    await userSessionsCloseService.execute({ user, language: "en" });

    expect(revokeTokensSpy).toHaveBeenCalledOnce();
  });

  it("should throw an error if no user auth provider conn is found", async () => {
    const user = await userFactory.create();

    await expect(
      userSessionsCloseService.execute({ user, language: "en" }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@user_session_close/NO_AUTH_PROVIDER_ACCOUNT_FOUND",
      }),
    );
  });
});
