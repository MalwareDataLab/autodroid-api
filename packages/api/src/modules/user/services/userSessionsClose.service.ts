import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Entity import
import { User } from "../entities/user.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";

// Service import
import { McpAuthorizationSessionsEndService } from "@modules/mcpAuthorization/services/mcpAuthorizationSessionsEnd.service";

interface IRequest {
  user: User;
  language: string;
}

@injectable()
class UserSessionsCloseService {
  private mcpAuthorizationSessionsEndService: McpAuthorizationSessionsEndService;

  constructor(
    @inject("AuthenticationProvider")
    private authenticationProvider: IAuthenticationProvider,

    @inject("UserAuthProviderConnRepository")
    private userAuthProviderConnRepository: IUserAuthProviderConnRepository,

    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {
    this.mcpAuthorizationSessionsEndService =
      new McpAuthorizationSessionsEndService(
        this.inMemoryDatabaseProvider,
        this.mcpAuthorizationGrantRepository,
      );
  }

  public async execute({ user, language }: IRequest): Promise<void> {
    const t = await i18n(language);

    const authenticationProvider =
      await this.authenticationProvider.getProvider(
        this.authenticationProvider.default_auth_provider,
      );

    const userAuthProviderConn =
      await this.userAuthProviderConnRepository.findOne({
        user_id: user.id,
        auth_provider: authenticationProvider.auth_provider,
      });

    if (!userAuthProviderConn)
      throw new AppError({
        key: "@user_session_close/NO_AUTH_PROVIDER_ACCOUNT_FOUND",
        message: t(
          "@user_session_close/NO_AUTH_PROVIDER_ACCOUNT_FOUND",
          "No connection found.",
        ),
      });

    await this.mcpAuthorizationSessionsEndService.execute({ user_id: user.id });

    await authenticationProvider.revokeTokens(userAuthProviderConn, language);

    await this.mcpAuthorizationSessionsEndService.execute({ user_id: user.id });
  }
}

export { UserSessionsCloseService };
