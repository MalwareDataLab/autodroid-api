import { randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker";
import { plainToInstance } from "class-transformer";
import { Factory } from "fishery";
import { container } from "tsyringe";

// Util import
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";

// Constant import
import {
  MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX,
  MCP_AUTHORIZATION_GRANT_ABSOLUTE_TTL_SECONDS,
  MCP_DEFAULT_SCOPES,
} from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";
import { MAX_SAFE_BIGINT } from "@shared/constants/maxSafeBigInt.constant";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";

// DTO import
import {
  IMcpAuthorizationGrantBase,
  McpAuthorizationGrantRelationFields,
} from "@modules/mcpAuthorization/types/IMcpAuthorizationGrant.dto";

// Entity import
import { McpAuthorizationGrant } from "@modules/mcpAuthorization/entities/mcpAuthorizationGrant.entity";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

class McpAuthorizationGrantFactory extends Factory<
  McpAuthorizationGrant,
  FactoryParams
> {
  static get repository() {
    return container.resolve("McpAuthorizationGrantRepository");
  }
}

const mcpAuthorizationGrantFactory = McpAuthorizationGrantFactory.define(
  ({ onCreate, associations }) => {
    const user = associations.user || userFactory.build();
    const created_at = new Date();

    const base: IMcpAuthorizationGrantBase = {
      id: randomBytes(16).toString("base64url"),
      seq: faker.number.bigInt({ min: 1, max: MAX_SAFE_BIGINT }),
      client_id: `${MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX}${randomBytes(8).toString("base64url")}`,
      client_name: "Example Agent",
      resource: "https://api.autodroid.example/mcp",
      scopes: MCP_DEFAULT_SCOPES,
      token_generation: 0,
      expires_at: new Date(
        created_at.getTime() +
          MCP_AUTHORIZATION_GRANT_ABSOLUTE_TTL_SECONDS * 1000,
      ),
      revoked_at: null,
      last_used_at: null,
      created_at,
      updated_at: created_at,

      /** Relations */
      user_id: user.id,
    };

    onCreate(async item => {
      return McpAuthorizationGrantFactory.repository.createOne(
        getBaseFactoryEntityData({
          base,
          item: await loadEntityRelations<
            McpAuthorizationGrantRelationFields,
            typeof item
          >(item, {
            user: {
              reference: "user",
              foreignKey: "user_id",
            },
          }),
        }),
      );
    });

    return plainToInstance(
      McpAuthorizationGrant,
      {
        ...base,
        ...associations,
      },
      { ignoreDecorators: true, enableCircularCheck: true },
    );
  },
);

export { mcpAuthorizationGrantFactory };
