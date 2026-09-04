import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Entity import
import { WorkerAccessToken } from "@modules/worker/entities/workerAccessToken.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Service import
import { WorkerRegisterService } from "@modules/worker/services/workerRegister.service";
import { WorkerUpdateRefreshTokenService } from "@modules/worker/services/workerUpdateRefreshToken.service";
import { WorkerGenerateAccessTokenService } from "@modules/worker/services/workerGenerateAccessToken.service";

// Schema import
import {
  WorkerRegisterSchema,
  WorkerRefreshTokenSchema,
} from "@modules/worker/schemas/worker.schema";

// Target import
import { WorkerRegistrationResolver } from "./workerRegistration.resolver";

describe("Resolver: WorkerRegistrationResolver", () => {
  const worker = workerFactory.build();

  const agent_info = { ip: "127.0.0.1" } as IParsedUserAgentInfoDTO;

  const graphQLContext = { agent_info } as GraphQLContext;

  let workerRegisterService: { execute: ReturnType<typeof vi.fn> };
  let workerUpdateRefreshTokenService: { execute: ReturnType<typeof vi.fn> };
  let workerGenerateAccessTokenService: { execute: ReturnType<typeof vi.fn> };

  let workerRegistrationResolver: WorkerRegistrationResolver;

  beforeEach(() => {
    workerRegisterService = { execute: vi.fn() };
    workerUpdateRefreshTokenService = { execute: vi.fn() };
    workerGenerateAccessTokenService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === WorkerRegisterService) return workerRegisterService;
      if (token === WorkerUpdateRefreshTokenService)
        return workerUpdateRefreshTokenService;
      if (token === WorkerGenerateAccessTokenService)
        return workerGenerateAccessTokenService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    workerRegistrationResolver = new WorkerRegistrationResolver();
  });

  it("should register a worker forwarding the data and the agent info", async () => {
    const data = {
      name: worker.name,
      internal_id: worker.internal_id,
      signature: worker.signature,
      registration_token: "registration-token",
      system_info: {},
    } as WorkerRegisterSchema;
    workerRegisterService.execute.mockResolvedValueOnce(worker);

    const result = await workerRegistrationResolver.workerRegister(
      data,
      graphQLContext,
    );

    expect(workerRegisterService.execute).toHaveBeenCalledWith({
      data,
      agent_info,
    });
    expect(result).toBe(worker);
  });

  it("should propagate a failure registering the worker", async () => {
    const error = new Error("register failed");
    workerRegisterService.execute.mockRejectedValueOnce(error);

    await expect(
      workerRegistrationResolver.workerRegister(
        {} as WorkerRegisterSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update the worker refresh token", async () => {
    const data = {
      worker_id: worker.id,
      refresh_token: worker.refresh_token,
    } as WorkerRefreshTokenSchema;
    workerUpdateRefreshTokenService.execute.mockResolvedValueOnce(worker);

    const result = await workerRegistrationResolver.workerUpdateRefreshToken(
      data,
      graphQLContext,
    );

    expect(workerUpdateRefreshTokenService.execute).toHaveBeenCalledWith({
      data,
      agent_info,
    });
    expect(result).toBe(worker);
  });

  it("should propagate a failure updating the worker refresh token", async () => {
    const error = new Error("refresh token failed");
    workerUpdateRefreshTokenService.execute.mockRejectedValueOnce(error);

    await expect(
      workerRegistrationResolver.workerUpdateRefreshToken(
        {} as WorkerRefreshTokenSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });

  it("should generate the worker access token", async () => {
    const data = {
      worker_id: worker.id,
      refresh_token: worker.refresh_token,
    } as WorkerRefreshTokenSchema;
    const workerAccessToken = {
      access_token: "access-token",
    } as unknown as WorkerAccessToken;
    workerGenerateAccessTokenService.execute.mockResolvedValueOnce(
      workerAccessToken,
    );

    const result = await workerRegistrationResolver.workerUpdateAccessToken(
      data,
      graphQLContext,
    );

    expect(workerGenerateAccessTokenService.execute).toHaveBeenCalledWith({
      data,
      agent_info,
    });
    expect(result).toBe(workerAccessToken);
  });

  it("should propagate a failure generating the worker access token", async () => {
    const error = new Error("access token failed");
    workerGenerateAccessTokenService.execute.mockRejectedValueOnce(error);

    await expect(
      workerRegistrationResolver.workerUpdateAccessToken(
        {} as WorkerRefreshTokenSchema,
        graphQLContext,
      ),
    ).rejects.toThrowError(error);
  });
});
