import { Args, Ctx, Mutation } from "type-graphql";
import { container } from "tsyringe";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";

// Schema import
import {
  WorkerRefreshTokenSchema,
  WorkerRegisterSchema,
} from "@modules/worker/schemas/worker.schema";

// Service import
import { WorkerRegisterService } from "@modules/worker/services/workerRegister.service";
import { WorkerUpdateRefreshTokenService } from "@modules/worker/services/workerUpdateRefreshToken.service";
import { WorkerGenerateAccessTokenService } from "@modules/worker/services/workerGenerateAccessToken.service";
import { WorkerAccessToken } from "@modules/worker/entities/workerAccessToken.entity";

class WorkerRegistrationResolver {
  @Mutation(() => Worker)
  async workerRegister(
    @Args() data: WorkerRegisterSchema,
    @Ctx() { agent_info }: GraphQLContext,
  ): Promise<Worker> {
    const workerRegisterService = container.resolve(WorkerRegisterService);

    const worker = await workerRegisterService.execute({
      data,
      agent_info,
    });

    return worker;
  }

  @Mutation(() => Worker)
  async workerUpdateRefreshToken(
    @Args() data: WorkerRefreshTokenSchema,
    @Ctx() { agent_info }: GraphQLContext,
  ): Promise<Worker> {
    const workerUpdateRefreshTokenService = container.resolve(
      WorkerUpdateRefreshTokenService,
    );

    const worker = await workerUpdateRefreshTokenService.execute({
      data,
      agent_info,
    });

    return worker;
  }

  @Mutation(() => WorkerAccessToken)
  async workerUpdateAccessToken(
    @Args() data: WorkerRefreshTokenSchema,
    @Ctx() { agent_info }: GraphQLContext,
  ): Promise<WorkerAccessToken> {
    const workerGenerateAccessTokenService = container.resolve(
      WorkerGenerateAccessTokenService,
    );

    const worker = await workerGenerateAccessTokenService.execute({
      data,
      agent_info,
    });

    return worker;
  }
}

export { WorkerRegistrationResolver };
