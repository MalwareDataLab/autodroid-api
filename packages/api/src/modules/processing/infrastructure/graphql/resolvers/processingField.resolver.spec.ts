import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Entity import
import { ProcessingFinishTimeEstimation } from "@modules/processing/entities/processingFinishTimeEstimation.entity";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { UserProcessingGetEstimatedFinishDateService } from "@modules/processing/services/userProcessingGetEstimatedFinishDate.service";

// Target import
import { ProcessingFieldResolver } from "./processingField.resolver";

describe("Resolver: ProcessingFieldResolver", () => {
  const user = userFactory.build();
  const processing = processingFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  let userProcessingGetEstimatedFinishDateService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let processingFieldResolver: ProcessingFieldResolver;

  beforeEach(() => {
    userProcessingGetEstimatedFinishDateService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessingGetEstimatedFinishDateService)
        return userProcessingGetEstimatedFinishDateService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    processingFieldResolver = new ProcessingFieldResolver();
  });

  it("should return the estimation for the root processing id", async () => {
    const processingEstimatedFinish = {
      estimated_finish_date: new Date("2024-05-04T10:00:00.000Z"),
    } as unknown as ProcessingFinishTimeEstimation;
    userProcessingGetEstimatedFinishDateService.execute.mockResolvedValueOnce(
      processingEstimatedFinish,
    );

    const result = await processingFieldResolver.estimated_finish(
      processing,
      graphQLContext,
    );

    expect(
      userProcessingGetEstimatedFinishDateService.execute,
    ).toHaveBeenCalledWith({
      user,
      processing_id: processing.id,
      language: "en",
    });
    expect(result).toBe(processingEstimatedFinish);
  });

  it("should return null when the estimation service rejects", async () => {
    userProcessingGetEstimatedFinishDateService.execute.mockRejectedValueOnce(
      new Error("estimation failed"),
    );

    const result = await processingFieldResolver.estimated_finish(
      processing,
      graphQLContext,
    );

    expect(result).toBeNull();
  });

  it("should return null when the context has no user session", async () => {
    const result = await processingFieldResolver.estimated_finish(processing, {
      language: "en",
    } as GraphQLContext);

    expect(
      userProcessingGetEstimatedFinishDateService.execute,
    ).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
