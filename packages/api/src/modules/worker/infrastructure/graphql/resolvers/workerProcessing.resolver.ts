import { Arg, Authorized, Ctx, Mutation, Query } from "type-graphql";
import { container } from "tsyringe";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { Processing } from "@modules/processing/entities/processing.entity";

// Schema import

// Service import
import { WorkerProcessingShowService } from "@modules/worker/services/workerProcessingShow.service";
import { WorkerHandleProcessingProgressService } from "@modules/worker/services/workerHandleProcessingProgress.service";
import { WorkerHandleProcessingSuccessService } from "@modules/worker/services/workerHandleProcessingSuccess.service";
import { WorkerHandleProcessingFailureService } from "@modules/worker/services/workerHandleProcessingFailure.service";

class WorkerProcessingResolver {
  @Authorized(["WORKER"])
  @Query(() => Processing)
  async workerProcessing(
    @Arg("processing_id") processing_id: string,
    @Ctx() { worker_session: { worker } }: GraphQLContext,
  ): Promise<Processing> {
    const workerProcessingShowService = container.resolve(
      WorkerProcessingShowService,
    );

    const processing = await workerProcessingShowService.execute({
      processing_id,
      worker,
    });

    return processing;
  }

  @Authorized(["WORKER"])
  @Mutation(() => Processing)
  async workerProcessingRegisterProgress(
    @Arg("processing_id") processing_id: string,
    @Ctx() { worker_session: { worker } }: GraphQLContext,
  ): Promise<Processing> {
    const workerHandleProcessingProgressService = container.resolve(
      WorkerHandleProcessingProgressService,
    );

    const processing = await workerHandleProcessingProgressService.execute({
      processing_id,
      worker,
    });

    return processing;
  }

  @Authorized(["WORKER"])
  @Mutation(() => Processing)
  async workerProcessingRegisterSuccess(
    @Arg("processing_id") processing_id: string,
    @Ctx() { worker_session: { worker } }: GraphQLContext,
  ): Promise<Processing> {
    const workerHandleProcessingSuccessService = container.resolve(
      WorkerHandleProcessingSuccessService,
    );

    const processing = await workerHandleProcessingSuccessService.execute({
      processing_id,
      worker,
    });

    return processing;
  }

  @Authorized(["WORKER"])
  @Mutation(() => Processing)
  async workerProcessingRegisterFailure(
    @Arg("processing_id") processing_id: string,
    @Ctx() { worker_session: { worker } }: GraphQLContext,
  ): Promise<Processing> {
    const workerHandleProcessingFailureService = container.resolve(
      WorkerHandleProcessingFailureService,
    );

    const processing = await workerHandleProcessingFailureService.execute({
      processing_id,
      worker,
    });

    return processing;
  }
}

export { WorkerProcessingResolver };
