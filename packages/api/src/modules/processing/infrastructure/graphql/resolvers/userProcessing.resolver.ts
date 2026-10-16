import { container } from "tsyringe";
import { Arg, Args, Authorized, Ctx, Mutation, Query } from "type-graphql";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";
import { ArgUUID } from "@shared/decorators/argUUID.decorator";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Entity import
import {
  Processing,
  PaginatedProcessing,
} from "@modules/processing/entities/processing.entity";
import { ProcessingFinishTimeEstimation } from "@modules/processing/entities/processingFinishTimeEstimation.entity";
import { ProcessingTimeEstimation } from "@modules/processing/entities/processingTimeEstimation.entity";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { UserProcessingExtendKeepUntilSchema } from "@modules/processing/schemas/processingExtendKeepUntil.schema";
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";
import {
  ProcessingGetEstimatedExecutionTimeSchema,
  ProcessingGetEstimatedFinishTimeSchema,
} from "@modules/processing/schemas/processingTimeEstimation.schema";
import { ProcessingUpdateVisibilitySchema } from "@modules/processing/schemas/processingUpdateVisibility.schema";
import { RequestDatasetProcessingSchema } from "@modules/processing/schemas/requestDatasetProcessing.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";

// Service import
import { UserProcessingDeleteService } from "@modules/processing/services/userProcessingDelete.service";
import { UserProcessingExtendKeepUntilService } from "@modules/processing/services/userProcessingExtendKeepUntil.service";
import { UserProcessingGetEstimatedExecutionTimeService } from "@modules/processing/services/userProcessingGetEstimatedExecutionTime.service";
import { UserProcessingGetEstimatedFinishDateService } from "@modules/processing/services/userProcessingGetEstimatedFinishDate.service";
import { UserProcessingIndexService } from "@modules/processing/services/userProcessingIndex.service";
import { UserProcessingShowService } from "@modules/processing/services/userProcessingShow.service";
import { UserProcessingUpdateVisibilityService } from "@modules/processing/services/userProcessingUpdateVisibility.service";
import { UserRequestDatasetProcessingService } from "@modules/processing/services/userRequestDatasetProcessing.service";

class UserProcessingResolver {
  @Authorized()
  @Query(() => PaginatedProcessing)
  async userProcesses(
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
    @ArgUUID("processing_id", { description: "The processing run id." })
    processing_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<Processing> {
    const userProcessingShowService = container.resolve(
      UserProcessingShowService,
    );

    const processing = await userProcessingShowService.execute({
      user: user_session.user,

      processing_id,

      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userRequestDatasetProcessing(
    @Arg("data", {
      description: "The dataset, the processor and the parameters of the run.",
    })
    data: RequestDatasetProcessingSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const userRequestDatasetProcessingService = container.resolve(
      UserRequestDatasetProcessingService,
    );

    const processing = await userRequestDatasetProcessingService.execute({
      params: data,

      user: user_session.user,
      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userProcessingUpdateVisibility(
    @ArgUUID("processing_id", { description: "The processing run id." })
    processing_id: string,

    @Args() params: ProcessingUpdateVisibilitySchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const userProcessingUpdateVisibilityService = container.resolve(
      UserProcessingUpdateVisibilityService,
    );

    const processing = await userProcessingUpdateVisibilityService.execute({
      processing_id,
      visibility: params.visibility,

      user: user_session.user,
      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userProcessingExtendKeepUntil(
    @ArgUUID("processing_id", { description: "The processing run id." })
    processing_id: string,

    @Args() params: UserProcessingExtendKeepUntilSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const userProcessingExtendKeepUntilService = container.resolve(
      UserProcessingExtendKeepUntilService,
    );

    const processing = await userProcessingExtendKeepUntilService.execute({
      processing_id,
      keep_until: params.keep_until,

      user: user_session.user,
      language,
    });

    return processing;
  }

  @Authorized()
  @Mutation(() => Processing)
  async userProcessingDelete(
    @ArgUUID("processing_id", { description: "The processing run id." })
    processing_id: string,
    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const userProcessingDeleteService = container.resolve(
      UserProcessingDeleteService,
    );

    const processing = await userProcessingDeleteService.execute({
      processing_id,

      user: user_session.user,
      language,
    });

    return processing;
  }

  @Authorized()
  @Query(() => ProcessingTimeEstimation)
  async userProcessingTimeEstimation(
    @Args()
    { dataset_id, processor_id }: ProcessingGetEstimatedExecutionTimeSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const userProcessingGetEstimatedExecutionTimeService = container.resolve(
      UserProcessingGetEstimatedExecutionTimeService,
    );

    const processingTimeEstimation =
      await userProcessingGetEstimatedExecutionTimeService.execute({
        user: user_session.user,

        dataset_id,
        processor_id,

        language,
      });

    return processingTimeEstimation;
  }

  @Authorized()
  @Query(() => ProcessingFinishTimeEstimation)
  async userProcessingEstimatedFinish(
    @Args() { processing_id }: ProcessingGetEstimatedFinishTimeSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ) {
    const userProcessingGetEstimatedFinishDateService = container.resolve(
      UserProcessingGetEstimatedFinishDateService,
    );

    const processingEstimatedFinish =
      await userProcessingGetEstimatedFinishDateService.execute({
        user: user_session.user,

        processing_id,

        language,
      });

    return processingEstimatedFinish;
  }
}

export { UserProcessingResolver };
