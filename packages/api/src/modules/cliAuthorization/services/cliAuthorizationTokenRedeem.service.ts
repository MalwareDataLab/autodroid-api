import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import { CLI_AUTHORIZATION_KEY_PREFIX } from "../constants/cliAuthorization.constant";

interface IRequest {
  code_verifier: string;
}

@injectable()
class CliAuthorizationTokenRedeemService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({ code_verifier }: IRequest): Promise<string> {
    const challenge = hashBase64Url(code_verifier);

    const token = await this.inMemoryDatabaseProvider.connection.getdel(
      `${CLI_AUTHORIZATION_KEY_PREFIX}${challenge}`,
    );

    if (!token) {
      throw new AppError({
        key: "@cli_authorization_token_redeem_service/CHALLENGE_NOT_AUTHORIZED",
        message: "This sign-in request has not been authorized yet.",
        statusCode: 404,
      });
    }

    return token;
  }
}

export { CliAuthorizationTokenRedeemService };
