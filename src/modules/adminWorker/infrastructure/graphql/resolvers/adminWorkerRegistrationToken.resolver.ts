import {
  Arg,
  Args,
  Authorized,
  Ctx,
  Directive,
  Mutation,
  Query,
} from "type-graphql";
import { container } from "tsyringe";

// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// Entity import
import {
  WorkerRegistrationToken,
  PaginatedWorkerRegistrationToken,
} from "@modules/worker/entities/workerRegistrationToken.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import {
  WorkerRegistrationTokenIndexSchema,
  WorkerRegistrationTokenCreateSchema,
} from "@modules/worker/schemas/workerRegistrationToken.schema";

// Service import
import { AdminWorkerRegistrationTokenCreateService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenCreate.service";
import { AdminWorkerRegistrationTokenIndexService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenIndex.service";
import { AdminWorkerRegistrationTokenShowService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenShow.service";
import { AdminWorkerRegistrationTokenDeleteService } from "@modules/adminWorker/services/adminWorkerRegistrationTokenDelete.service";

class AdminWorkerRegistrationTokenResolver {
  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => PaginatedWorkerRegistrationToken)
  async adminWorkerRegistrationTokens(
    @Args() filter: WorkerRegistrationTokenIndexSchema,

    @Args() pagination: PaginationSchema,
    @SortingArg<WorkerRegistrationToken>(WorkerRegistrationTokenSortingOptions)
    sorting: SortingFieldSchema<typeof WorkerRegistrationTokenSortingOptions>[],

    @Ctx() { user_session, language }: GraphQLContext,
  ): Promise<PaginatedWorkerRegistrationToken> {
    const adminWorkerRegistrationTokenIndexService = container.resolve(
      AdminWorkerRegistrationTokenIndexService,
    );

    const paginatedWorkerRegistrationTokens =
      await adminWorkerRegistrationTokenIndexService.execute({
        filter,

        pagination,
        sorting,

        user: user_session.user,
        language,
      });

    return paginatedWorkerRegistrationTokens;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => WorkerRegistrationToken)
  async adminWorkerRegistrationToken(
    @Arg("worker_registration_token_id") worker_registration_token_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<WorkerRegistrationToken> {
    const adminWorkerRegistrationTokenShowService = container.resolve(
      AdminWorkerRegistrationTokenShowService,
    );

    const workerRegistrationToken =
      await adminWorkerRegistrationTokenShowService.execute({
        worker_registration_token_id,

        user: user_session.user,
        language,
      });

    return workerRegistrationToken;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => WorkerRegistrationToken)
  async adminWorkerRegistrationTokenCreate(
    @Arg("data") data: WorkerRegistrationTokenCreateSchema,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<WorkerRegistrationToken> {
    const adminWorkerRegistrationTokenCreateService = container.resolve(
      AdminWorkerRegistrationTokenCreateService,
    );

    const workerRegistrationToken =
      await adminWorkerRegistrationTokenCreateService.execute({
        data,

        user: user_session.user,
        language,
      });

    return workerRegistrationToken;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => WorkerRegistrationToken)
  async adminWorkerRegistrationTokenDelete(
    @Arg("worker_registration_token_id") worker_registration_token_id: string,

    @Ctx() { language, user_session }: GraphQLContext,
  ): Promise<WorkerRegistrationToken> {
    const adminWorkerRegistrationTokenDeleteService = container.resolve(
      AdminWorkerRegistrationTokenDeleteService,
    );

    const workerRegistrationToken =
      await adminWorkerRegistrationTokenDeleteService.execute({
        worker_registration_token_id,

        user: user_session.user,
        language,
      });

    return workerRegistrationToken;
  }
}

export { AdminWorkerRegistrationTokenResolver };
