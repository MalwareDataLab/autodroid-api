import { Authorized, Ctx, Query } from "type-graphql";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";

class WorkerResolver {
  @Authorized(["WORKER"])
  @Query(() => Worker)
  async worker(@Ctx() { worker_session }: GraphQLContext): Promise<Worker> {
    return worker_session.worker;
  }
}

export { WorkerResolver };
