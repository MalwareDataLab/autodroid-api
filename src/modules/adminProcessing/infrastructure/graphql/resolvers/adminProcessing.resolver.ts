import {
  Arg,
  Args,
  Authorized,
  Ctx,
  Directive,
  Int,
  Mutation,
  Query,
} from "type-graphql";
import { container } from "tsyringe";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Entity import
import {
  Processing,
  PaginatedProcessing,
} from "@modules/processing/entities/processing.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import {
  AdminProcessingIndexSchema,
  AdminProcessingUpdateSchema,
  AdminProcessingFailDanglingSchema,
} from "@modules/adminProcessing/schemas/adminProcessing.schema";

// Service import
import { AdminProcessingDeleteService } from "@modules/adminProcessing/services/adminProcessingDelete.service";
import { AdminProcessingIndexService } from "@modules/adminProcessing/services/adminProcessingIndex.service";
import { AdminProcessingShowService } from "@modules/adminProcessing/services/adminProcessingShow.service";
import { AdminProcessingUpdateService } from "@modules/adminProcessing/services/adminProcessingUpdate.service";
import { AdminProcessingCleanExpiredService } from "@modules/adminProcessing/services/adminProcessingCleanExpired.service";
import { AdminProcessingFailDanglingService } from "@modules/adminProcessing/services/adminProcessingFailDangling.service";

class AdminProcessingResolver {
  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => PaginatedProcessing)
  async adminProcesses(
    @Args() filter: AdminProcessingIndexSchema,

    @Args() pagination: PaginationSchema,
    @SortingArg<Processing>(ProcessingSortingOptions)
    sorting: SortingFieldSchema<typeof ProcessingSortingOptions>[],

    @Ctx() { session }: GraphQLContext,
  ): Promise<PaginatedProcessing> {
    const adminProcessingIndexService = container.resolve(
      AdminProcessingIndexService,
    );

    const paginatedProcesses = await adminProcessingIndexService.execute({
      user: session.user,

      filter,

      pagination,
      sorting,
    });

    return paginatedProcesses;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => Processing)
  async adminProcessing(
    @Arg("processing_id") processing_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processing> {
    const adminProcessingShowService = container.resolve(
      AdminProcessingShowService,
    );

    const processing = await adminProcessingShowService.execute({
      processing_id,

      user: session.user,
      language,
    });

    return processing;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Processing)
  async adminProcessingUpdate(
    @Arg("processing_id") processing_id: string,
    @Arg("data") data: AdminProcessingUpdateSchema,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processing> {
    const adminProcessingUpdateService = container.resolve(
      AdminProcessingUpdateService,
    );

    const processing = await adminProcessingUpdateService.execute({
      processing_id,
      data,

      user: session.user,
      language,
    });

    return processing;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Processing)
  async adminProcessingDelete(
    @Arg("processing_id") processing_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Processing> {
    const adminProcessingDeleteService = container.resolve(
      AdminProcessingDeleteService,
    );

    const processing = await adminProcessingDeleteService.execute({
      processing_id,

      user: session.user,
      language,
    });

    return processing;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Int)
  async adminProcessingCleanExpired(
    @Ctx() { language, session }: GraphQLContext,
  ): Promise<number> {
    const adminProcessingCleanExpiredService = container.resolve(
      AdminProcessingCleanExpiredService,
    );

    const count = await adminProcessingCleanExpiredService.execute({
      user: session.user,
      language,
    });

    return count;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Int)
  async adminProcessingFailDangling(
    @Ctx() { language, session }: GraphQLContext,
    @Args() params: AdminProcessingFailDanglingSchema,
  ): Promise<number> {
    const adminProcessingFailDanglingService = container.resolve(
      AdminProcessingFailDanglingService,
    );

    const count = await adminProcessingFailDanglingService.execute({
      user: session.user,
      params,
      language,
    });

    return count;
  }
}

export { AdminProcessingResolver };
