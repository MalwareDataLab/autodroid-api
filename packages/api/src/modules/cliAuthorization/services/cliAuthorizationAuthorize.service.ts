import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Constant import
import {
  CLI_AUTHORIZATION_CODE_KEY_PREFIX,
  CLI_AUTHORIZATION_KEY_PREFIX,
  CLI_AUTHORIZATION_TTL_SECONDS,
} from "../constants/cliAuthorization.constant";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

interface IRequest {
  user_code: string;
  user_auth_provider_conn: UserAuthProviderConn;
  language: string;
}

@injectable()
class CliAuthorizationAuthorizeService {
  constructor(
    @inject("AuthenticationProvider")
    private authenticationProvider: IAuthenticationProvider,

    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({
    user_code,
    user_auth_provider_conn,
    language,
  }: IRequest): Promise<void> {
    const codeKey = `${CLI_AUTHORIZATION_CODE_KEY_PREFIX}${user_code}`;
    const challenge =
      await this.inMemoryDatabaseProvider.connection.get(codeKey);

    if (!challenge) {
      throw new AppError({
        key: "@cli_authorization_authorize_service/CODE_NOT_FOUND",
        message: "This code was not found or has expired.",
        statusCode: 404,
      });
    }

    const provider = await this.authenticationProvider.getProvider(
      user_auth_provider_conn.auth_provider,
      language,
    );

    const token = await provider.createUserTokenByCode({
      code: user_auth_provider_conn.code,
      language,
    });

    await this.inMemoryDatabaseProvider.connection.del(codeKey);

    const result = await this.inMemoryDatabaseProvider.connection.set(
      `${CLI_AUTHORIZATION_KEY_PREFIX}${challenge}`,
      token,
      "EX",
      CLI_AUTHORIZATION_TTL_SECONDS,
      "NX",
    );

    if (result !== "OK") {
      throw new AppError({
        key: "@cli_authorization_authorize_service/CHALLENGE_ALREADY_AUTHORIZED",
        message: "This sign-in request was already authorized.",
        statusCode: 409,
      });
    }
  }
}

export { CliAuthorizationAuthorizeService };
