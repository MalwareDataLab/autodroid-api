import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { inject, injectable } from "tsyringe";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import {
  MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX,
  MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX,
} from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationTokenRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

interface IRequest {
  client: OAuthClientInformationFull;
  request: OAuthTokenRevocationRequest;
}

@injectable()
class McpAuthorizationTokenRevokeService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({ client, request }: IRequest): Promise<void> {
    const tokenHash = hashBase64Url(request.token);

    const [, revokedRefreshRecord] = await Promise.all([
      this.deleteIfOwnedByClient(
        `${MCP_AUTHORIZATION_ACCESS_TOKEN_KEY_PREFIX}${tokenHash}`,
        client.client_id,
      ),
      this.deleteIfOwnedByClient(
        `${MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX}${tokenHash}`,
        client.client_id,
      ),
    ]);

    if (revokedRefreshRecord)
      await this.mcpAuthorizationGrantRepository.updateMany(
        { id: revokedRefreshRecord.grant_id, active: true },
        { revoked_at: new Date() },
      );
  }

  private async deleteIfOwnedByClient(
    key: string,
    client_id: string,
  ): Promise<IMcpAuthorizationTokenRecordDTO | null> {
    const raw = await this.inMemoryDatabaseProvider.connection.get(key);
    if (!raw) return null;

    const record: IMcpAuthorizationTokenRecordDTO = JSON.parse(raw);
    if (record.client_id !== client_id) return null;

    await this.inMemoryDatabaseProvider.connection.del(key);
    return record;
  }
}

export { McpAuthorizationTokenRevokeService };
