import {
  Authorized,
  Ctx,
  FieldResolver,
  Resolver,
  ResolverInterface,
  Root,
} from "type-graphql";
import { container } from "tsyringe";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";
import { ProcessingFinishTimeEstimation } from "@modules/processing/entities/processingFinishTimeEstimation.entity";

// Service import
import { UserProcessingGetEstimatedFinishDateService } from "@modules/processing/services/userProcessingGetEstimatedFinishDate.service";

@Resolver(() => Processing)
class ProcessingFieldResolver implements ResolverInterface<Processing> {
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
