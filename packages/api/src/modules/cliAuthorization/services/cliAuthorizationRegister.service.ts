import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Constant import
import {
  CLI_AUTHORIZATION_CODE_KEY_PREFIX,
  CLI_AUTHORIZATION_TTL_SECONDS,
} from "../constants/cliAuthorization.constant";

interface IRequest {
  code_challenge: string;
  user_code: string;
}

@injectable()
class CliAuthorizationRegisterService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({ code_challenge, user_code }: IRequest): Promise<void> {
    const result = await this.inMemoryDatabaseProvider.connection.set(
      `${CLI_AUTHORIZATION_CODE_KEY_PREFIX}${user_code}`,
      code_challenge,
      "EX",
      CLI_AUTHORIZATION_TTL_SECONDS,
      "NX",
    );

    if (result !== "OK") {
      throw new AppError({
        key: "@cli_authorization_register_service/CODE_ALREADY_REGISTERED",
        message: "This code is already in use.",
        statusCode: 409,
      });
    }
  }
}

export { CliAuthorizationRegisterService };
