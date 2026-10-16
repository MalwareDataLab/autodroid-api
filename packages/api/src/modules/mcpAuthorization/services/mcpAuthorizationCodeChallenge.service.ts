import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import { MCP_AUTHORIZATION_CODE_KEY_PREFIX } from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationCodeRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

interface IRequest {
  client: OAuthClientInformationFull;
  authorizationCode: string;
}

const ERROR_KEY_PREFIX = "@mcp_authorization_code_challenge_service";

@injectable()
class McpAuthorizationCodeChallengeService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({
    client,
    authorizationCode,
  }: IRequest): Promise<string> {
    const raw = await this.inMemoryDatabaseProvider.connection.get(
      `${MCP_AUTHORIZATION_CODE_KEY_PREFIX}${hashBase64Url(authorizationCode)}`,
    );

    if (!raw)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/CODE_NOT_FOUND`,
        message: "This authorization code was not found or has expired.",
        statusCode: 400,
      });

    const record: IMcpAuthorizationCodeRecordDTO = JSON.parse(raw);

    if (record.client_id !== client.client_id)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/CODE_CLIENT_MISMATCH`,
        message: "This authorization code was not issued to this client.",
        statusCode: 400,
      });

    return record.code_challenge;
  }
}

export { McpAuthorizationCodeChallengeService };
