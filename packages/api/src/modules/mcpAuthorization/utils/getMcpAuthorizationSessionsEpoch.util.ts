// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Constant import
import { MCP_AUTHORIZATION_SESSIONS_EPOCH_KEY_PREFIX } from "../constants/mcpAuthorization.constant";

interface IParams {
  inMemoryDatabaseProvider: IInMemoryDatabaseProvider;
  user_id: string;
}

const getMcpAuthorizationSessionsEpochKey = (user_id: string): string =>
  `${MCP_AUTHORIZATION_SESSIONS_EPOCH_KEY_PREFIX}${user_id}`;

const getMcpAuthorizationSessionsEpoch = async ({
  inMemoryDatabaseProvider,
  user_id,
}: IParams): Promise<number> =>
  Number(
    (await inMemoryDatabaseProvider.connection.get(
      getMcpAuthorizationSessionsEpochKey(user_id),
    )) ?? 0,
  );

export {
  getMcpAuthorizationSessionsEpoch,
  getMcpAuthorizationSessionsEpochKey,
};
