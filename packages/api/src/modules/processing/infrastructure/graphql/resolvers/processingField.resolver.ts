import { container } from "tsyringe";
import { Authorized, Ctx, FieldResolver, Resolver, Root } from "type-graphql";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Util import
import { getVisibleOwner } from "@modules/user/utils/getVisibleOwner.util";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";
import { ProcessingFinishTimeEstimation } from "@modules/processing/entities/processingFinishTimeEstimation.entity";
import { User } from "@modules/user/entities/user.entity";

// Service import
import { UserProcessingGetEstimatedFinishDateService } from "@modules/processing/services/userProcessingGetEstimatedFinishDate.service";

@Resolver(() => Processing)
class ProcessingFieldResolver {
  @FieldResolver()
  user(
    @Root() processing: Processing,

    @Ctx() { user_session }: GraphQLContext,
  ): User | null {
    return getVisibleOwner(processing, user_session);
  }

  @Authorized()
  @FieldResolver(() => ProcessingFinishTimeEstimation, { nullable: true })
  async estimated_finish(
    @Root() processing: Processing,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<ProcessingFinishTimeEstimation | null> {
    try {
      const userProcessingGetEstimatedFinishDateService = container.resolve(
        UserProcessingGetEstimatedFinishDateService,
      );

      const processingEstimatedFinish =
        await userProcessingGetEstimatedFinishDateService.execute({
          user: user_session.user,

          processing_id: processing.id,

          language,
        });

      return processingEstimatedFinish;
    } catch {
      return null;
    }
  }
}

export { ProcessingFieldResolver };
