import {
  Args,
  Authorized,
  Ctx,
  FieldResolver,
  Resolver,
  Root,
} from "type-graphql";
import { container } from "tsyringe";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Entity import
import { Processor } from "@modules/processor/entities/processor.entity";
import {
  PaginatedProcessing,
  Processing,
} from "@modules/processing/entities/processing.entity";

// Service import
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";

// Schema import
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";

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

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<PaginatedProcessing> {
    const userProcessingIndexService = container.resolve(
      UserProcessingIndexService,
    );

    const paginatedProcesses = await userProcessingIndexService.execute({
      user: session.user,

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
