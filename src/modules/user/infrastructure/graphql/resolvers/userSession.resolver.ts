import { container } from "tsyringe";
import { Authorized, Ctx, Mutation, Resolver } from "type-graphql";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// DTO import
import { UserSessionsCloseService } from "@modules/user/services/userSessionsClose.service";

@Resolver()
class UserSessionResolver {
  @Authorized()
  @Mutation(() => UserAuthProviderConn)
  async userSessionsClose(
    @Ctx() { user_session, language }: GraphQLContext,
  ): Promise<UserAuthProviderConn> {
    const userSessionsCloseService = container.resolve(
      UserSessionsCloseService,
    );

    await userSessionsCloseService.execute({
      user: user_session.user,
      language,
    });

    return user_session.user_auth_provider_conn;
  }
}

export { UserSessionResolver };
