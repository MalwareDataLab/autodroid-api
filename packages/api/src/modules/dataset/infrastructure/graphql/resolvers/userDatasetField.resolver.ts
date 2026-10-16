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

// Util import
import { getVisibleOwner } from "@modules/user/utils/getVisibleOwner.util";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import {
  PaginatedProcessing,
  Processing,
} from "@modules/processing/entities/processing.entity";
import { User } from "@modules/user/entities/user.entity";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";

@Resolver(() => Dataset)
class UserDatasetFieldResolver {
  @FieldResolver()
  user(
    @Root() dataset: Dataset,

    @Ctx() { user_session }: GraphQLContext,
  ): User | null {
    return getVisibleOwner(dataset, user_session);
  }

  @Authorized()
  @FieldResolver(() => PaginatedProcessing)
  async processes(
    @Root() dataset: Dataset,

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
        dataset_id: dataset.id,
      },

      pagination,
      sorting,

      language,
    });

    return paginatedProcesses;
  }
}

export { UserDatasetFieldResolver };
