import { container } from "tsyringe";
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { McpAuthorizationGrant } from "@modules/mcpAuthorization/entities/mcpAuthorizationGrant.entity";

// Service import
import { UserMcpAuthorizationGrantIndexService } from "@modules/mcpAuthorization/services/userMcpAuthorizationGrantIndex.service";
import { UserMcpAuthorizationGrantRevokeService } from "@modules/mcpAuthorization/services/userMcpAuthorizationGrantRevoke.service";

@Resolver()
class UserMcpAuthorizationGrantResolver {
  @Authorized()
  @Query(() => [McpAuthorizationGrant])
  async userMcpAuthorizationGrants(
    @Ctx() { user_session }: GraphQLContext,
  ): Promise<McpAuthorizationGrant[]> {
    const userMcpAuthorizationGrantIndexService = container.resolve(
      UserMcpAuthorizationGrantIndexService,
    );

    return userMcpAuthorizationGrantIndexService.execute({
      user_id: user_session.user.id,
    });
  }

  @Authorized()
  @Mutation(() => McpAuthorizationGrant)
  async userMcpAuthorizationGrantRevoke(
    @Arg("mcp_authorization_grant_id", { description: "The connection id." })
    mcp_authorization_grant_id: string,

    @Ctx() { user_session, language }: GraphQLContext,
  ): Promise<McpAuthorizationGrant> {
    const userMcpAuthorizationGrantRevokeService = container.resolve(
      UserMcpAuthorizationGrantRevokeService,
    );

    return userMcpAuthorizationGrantRevokeService.execute({
      user_id: user_session.user.id,
      grant_id: mcp_authorization_grant_id,
      language,
    });
  }
}

export { UserMcpAuthorizationGrantResolver };
