import { beforeEach, describe, expect, it } from "vitest";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Entity import
import { WorkerSession } from "@modules/worker/entities/workerSession.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Target import
import { WorkerResolver } from "./worker.resolver";

describe("Resolver: WorkerResolver", () => {
  const worker = workerFactory.build();

  const workerSession = { worker } as WorkerSession;

  const graphQLContext = {
    worker_session: workerSession,
  } as GraphQLContext;

  let workerResolver: WorkerResolver;

  beforeEach(() => {
    workerResolver = new WorkerResolver();
  });

  it("should return the worker of the context worker session", async () => {
    const result = await workerResolver.worker(graphQLContext);

    expect(result).toBe(worker);
  });

  it("should reject when the context has no worker session", async () => {
    await expect(
      workerResolver.worker({} as GraphQLContext),
    ).rejects.toThrowError(TypeError);
  });
});
