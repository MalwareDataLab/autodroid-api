import { container } from "tsyringe";
import {
  Args,
  Authorized,
  Ctx,
  FieldResolver,
  Resolver,
  Root,
} from "type-graphql";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Entity import
import {
  PaginatedProcessing,
  Processing,
} from "@modules/processing/entities/processing.entity";
import { Processor } from "@modules/processor/entities/processor.entity";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";

@Resolver(() => Processor)
class UserProcessorFieldResolver {
  @Authorized()
  @FieldResolver(() => PaginatedProcessing)
  async processes(
    @Root() processor: Processor,

    @Args() params: ProcessingIndexSchema,

    @Args() pagination: PaginationSchema,
    @SortingArg<Processing>(ProcessingSortingOptions)
    sorting: SortingFieldSchema<typeof ProcessingSortingOptions>[],

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<PaginatedProcessing> {
    const userProcessingIndexService = container.resolve(
      UserProcessingIndexService,
    );

    const paginatedProcesses = await userProcessingIndexService.execute({
      user: user_session.user,

      params: {
        ...params,
        processor_id: processor.id,
      },

      pagination,
      sorting,

      language,
    });

    return paginatedProcesses;
  }
}

export { UserProcessorFieldResolver };
