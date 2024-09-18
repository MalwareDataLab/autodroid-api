import { inject, injectable } from "tsyringe";
import { isBefore } from "date-fns";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

// Enum import
import { AUTH_PROVIDER } from "@shared/container/providers/AuthenticationProvider/types/authProvider.enum";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Repository import
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";
import { IUserRepository } from "@modules/user/repositories/IUser.repository";

// Service import
import { HandleUserSessionService } from "./handleUserSession.service";

interface IRequest {
  access_token: string;
  auth_provider?: AUTH_PROVIDER;

  allow_existing_only?: boolean;

  agent_info?: IParsedUserAgentInfoDTO;
  language: string;
}

@injectable()
class HandleAuthenticationService {
  constructor(
    @inject("AuthenticationProvider")
    private authenticationProvider: IAuthenticationProvider,

    @inject("UserAuthProviderConnRepository")
    private userAuthProviderConnRepository: IUserAuthProviderConnRepository,

    @inject("UserRepository")
    private userRepository: IUserRepository,
  ) {}

  public async execute({
    allow_existing_only,
    access_token,
    agent_info,
    auth_provider = this.authenticationProvider.default_auth_provider,
    language,
  }: IRequest): Promise<Session> {
    const t = await i18n(language);

    const authenticationProvider =
      await this.authenticationProvider.getProvider(auth_provider);

    const userAuthProviderSession =
      await authenticationProvider.verifyAccessToken({
        access_token,
        language,
      });

    if (isBefore(userAuthProviderSession.access_token_expires_at, new Date()))
      throw new AppError({
        key: "@handle_authentication_service/EXPIRED_TOKEN",
        message: t(
          "@handle_authentication_service/EXPIRED_TOKEN",
          "This session has expired.",
        ),
      });

    const handleUserSessionService = new HandleUserSessionService(
      this.userAuthProviderConnRepository,
      this.userRepository,
    );

    const userSession = await handleUserSessionService.execute({
      allow_existing_only,
      user_auth_provider_session: userAuthProviderSession,
      authenticationProvider,
      agent_info,
      language,
    });

    const { user } = userSession.user_auth_provider_conn;

    return parse(Session, {
      user,
      user_auth_provider_conn: userSession.user_auth_provider_conn,
      user_session: userSession,
      is_admin: user.is_admin,
    } satisfies Session);
  }
}

export { HandleAuthenticationService };
