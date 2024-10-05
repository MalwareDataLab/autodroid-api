import { Arg, Args, Authorized, Ctx, Query } from "type-graphql";
import { container } from "tsyringe";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Entity import
import {
  Processor,
  PaginatedProcessor,
} from "@modules/processor/entities/processor.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { UserProcessorIndexService } from "@modules/processor/services/userProcessorIndex.service";
import { UserProcessorShowService } from "@modules/processor/services/userProcessorShow.service";

class UserProcessorResolver {
  @Authorized()
  @Query(() => PaginatedProcessor)
  async userProcessors(
    @Args() pagination: PaginationSchema,
    @SortingArg<Processor>(ProcessorSortingOptions)
    sorting: SortingFieldSchema<typeof ProcessorSortingOptions>[],

    @Ctx() { session }: GraphQLContext,
  ): Promise<PaginatedProcessor> {
    const userProcessorIndexService = container.resolve(
      UserProcessorIndexService,
    );

    const paginatedProcessors = await userProcessorIndexService.execute({
      user: session.user,
      pagination,
      sorting,
    });

    return paginatedProcessors;
  }

  @Authorized()
  @Query(() => Processor)
  async userProcessor(
    @Arg("processor_id") processor_id: string,

    @Ctx() { language }: GraphQLContext,
  ): Promise<Processor> {
    const userProcessorShowService = container.resolve(
      UserProcessorShowService,
    );

    const processor = await userProcessorShowService.execute({
      processor_id,
      language,
    });

    return processor;
  }
}

export { UserProcessorResolver };
