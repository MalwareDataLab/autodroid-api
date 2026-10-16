import { inject, injectable } from "tsyringe";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { getMcpAuthorizationSessionsEpochKey } from "../utils/getMcpAuthorizationSessionsEpoch.util";

// Constant import
import { MCP_AUTHORIZATION_SESSIONS_EPOCH_TTL_SECONDS } from "../constants/mcpAuthorization.constant";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

interface IRequest {
  user_id: string;
}

@injectable()
class McpAuthorizationSessionsEndService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,

    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({ user_id }: IRequest): Promise<void> {
    const epochKey = getMcpAuthorizationSessionsEpochKey(user_id);

    await this.inMemoryDatabaseProvider.connection.incr(epochKey);
    await this.inMemoryDatabaseProvider.connection.expire(
      epochKey,
      MCP_AUTHORIZATION_SESSIONS_EPOCH_TTL_SECONDS,
    );

    await this.mcpAuthorizationGrantRepository.updateMany(
      { user_id, active: true },
      { revoked_at: new Date() },
    );
  }
}

export { McpAuthorizationSessionsEndService };
