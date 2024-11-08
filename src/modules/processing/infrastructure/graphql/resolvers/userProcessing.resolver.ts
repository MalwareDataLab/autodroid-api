import { Arg, Args, Authorized, Ctx, Mutation, Query } from "type-graphql";
import { container } from "tsyringe";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Entity import
import {
  Processing,
  PaginatedProcessing,
} from "@modules/processing/entities/processing.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import { RequestDatasetProcessingSchema } from "@modules/processing/schemas/requestDatasetProcessing.schema";
import { ProcessingUpdateVisibilitySchema } from "@modules/processing/schemas/processingUpdateVisibility.schema";
import { UserProcessingExtendKeepUntilSchema } from "@modules/processing/schemas/processingExtendKeepUntil.schema";

// Service import
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";
import { UserProcessingShowService } from "@modules/processing/services/userProcessingShow.service";
import { UserProcessingDeleteService } from "@modules/processing/services/userProcessingDelete.service";
import { UserRequestDatasetProcessingService } from "@modules/processing/services/userRequestDatasetProcessing.service";
import { UserProcessingExtendKeepUntilService } from "@modules/processing/services/userProcessingExtendKeepUntil.service";
import { UserProcessingUpdateVisibilityService } from "@modules/processing/services/userProcessingUpdateVisibility.service";

class UserProcessingResolver {
  @Authorized()
  @Query(() => PaginatedProcessing)
  async userProcesses(
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

      params,

      pagination,
      sorting,

      language,
    });

    return paginatedProcesses;
  }

  @Authorized()
  @Query(() => Processing)
  async userProcessing(
    @Arg("processing_id") processing_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processing> {
    const userProcessingShowService = container.resolve(
      UserProcessingShowService,
    );

    const processing = await userProcessingShowService.execute({
      user: session.user,

      processing_id,

      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userRequestDatasetProcessing(
    @Arg("data") data: RequestDatasetProcessingSchema,

    @Ctx() { language, session }: GraphQLContext,
  ) {
    const userRequestDatasetProcessingService = container.resolve(
      UserRequestDatasetProcessingService,
    );

    const processing = await userRequestDatasetProcessingService.execute({
      params: data,

      user: session.user,
      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userProcessingUpdateVisibility(
    @Arg("processing_id") processing_id: string,

    @Args() params: ProcessingUpdateVisibilitySchema,

    @Ctx() { language, session }: GraphQLContext,
  ) {
    const userProcessingUpdateVisibilityService = container.resolve(
      UserProcessingUpdateVisibilityService,
    );

    const processing = await userProcessingUpdateVisibilityService.execute({
      processing_id,
      visibility: params.visibility,

      user: session.user,
      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userProcessingExtendKeepUntil(
    @Arg("processing_id") processing_id: string,

    @Args() params: UserProcessingExtendKeepUntilSchema,

    @Ctx() { language, session }: GraphQLContext,
  ) {
    const userProcessingExtendKeepUntilService = container.resolve(
      UserProcessingExtendKeepUntilService,
    );

    const processing = await userProcessingExtendKeepUntilService.execute({
      processing_id,
      keep_until: params.keep_until,

      user: session.user,
      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userProcessingDelete(
    @Arg("processing_id") processing_id: string,
    @Ctx() { language, session }: GraphQLContext,
  ) {
    const userProcessingDeleteService = container.resolve(
      UserProcessingDeleteService,
    );

    const processing = await userProcessingDeleteService.execute({
      processing_id,

      user: session.user,
      language,
    });

    return processing;
  }
}

export { UserProcessingResolver };
