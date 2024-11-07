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
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Entity import
import {
  Worker,
  PaginatedWorker,
} from "@modules/worker/entities/worker.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Decorator import
import { SortingArg } from "@modules/sorting/infrastructure/graphql/decorators/sortingArg.decorator";

// Schema import
import { PaginationSchema } from "@modules/pagination/schemas/pagination.schema";
import { SortingFieldSchema } from "@modules/sorting/schemas/sorting.schema";
import { WorkerIndexSchema } from "@modules/worker/schemas/worker.schema";

// Service import
import { AdminWorkerIndexService } from "@modules/adminWorker/services/adminWorkerIndex.service";
import { AdminWorkerShowService } from "@modules/adminWorker/services/adminWorkerShow.service";
import { AdminWorkerUpdateService } from "@modules/adminWorker/services/adminWorkerUpdate.service";
import { AdminWorkerDeleteService } from "@modules/adminWorker/services/adminWorkerDelete.service";
import { AdminWorkerUpdateSchema } from "@modules/adminWorker/schemas/adminWorkerUpdate.schema";

class AdminWorkerResolver {
  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => PaginatedWorker)
  async adminWorkers(
    @Args() filter: WorkerIndexSchema,

    @Args() pagination: PaginationSchema,
    @SortingArg<Worker>(WorkerSortingOptions)
    sorting: SortingFieldSchema<typeof WorkerSortingOptions>[],

    @Ctx() { session, language }: GraphQLContext,
  ): Promise<PaginatedWorker> {
    const adminWorkerIndexService = container.resolve(AdminWorkerIndexService);

    const paginatedWorkers = await adminWorkerIndexService.execute({
      filter,

      pagination,
      sorting,

      user: session.user,
      language,
    });

    return paginatedWorkers;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Query(() => Worker)
  async adminWorker(
    @Arg("worker_id") worker_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Worker> {
    const adminWorkerShowService = container.resolve(AdminWorkerShowService);

    const worker = await adminWorkerShowService.execute({
      worker_id,

      user: session.user,
      language,
    });

    return worker;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Worker)
  async adminWorkerUpdate(
    @Arg("worker_id") worker_id: string,

    @Arg("data") data: AdminWorkerUpdateSchema,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Worker> {
    const adminWorkerUpdateService = container.resolve(
      AdminWorkerUpdateService,
    );

    const worker = await adminWorkerUpdateService.execute({
      worker_id,
      data,

      user: session.user,
      language,
    });

    return worker;
  }

  @Directive("@auth(requires: ADMIN)")
  @Authorized(["ADMIN"])
  @Mutation(() => Worker)
  async adminWorkerDelete(
    @Arg("worker_id") worker_id: string,

    @Ctx() { language, session }: GraphQLContext,
  ): Promise<Worker> {
    const adminWorkerDeleteService = container.resolve(
      AdminWorkerDeleteService,
    );

    const worker = await adminWorkerDeleteService.execute({
      worker_id,

      user: session.user,
      language,
    });

    return worker;
  }
}

export { AdminWorkerResolver };
