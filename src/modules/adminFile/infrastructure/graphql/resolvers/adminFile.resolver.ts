import { Authorized, Ctx, Directive, Int, Mutation } from "type-graphql";
import { container } from "tsyringe";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { AdminFileRemoveAllDanglingService } from "@modules/adminFile/services/adminFileRemoveAllDangling.service";

class AdminFileResolver {
  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Int)
  async adminFileRemoveAllDangling(
    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<number> {
    const adminFileRemoveAllDanglingService = container.resolve(
      AdminFileRemoveAllDanglingService,
    );

    const count = await adminFileRemoveAllDanglingService.execute({
      user: user_session.user,
      language,
    });

    return count;
  }
}

export { AdminFileResolver };
