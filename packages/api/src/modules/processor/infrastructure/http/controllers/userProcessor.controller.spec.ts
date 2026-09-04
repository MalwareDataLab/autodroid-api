import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Service import
import { UserProcessorIndexService } from "@modules/processor/services/userProcessorIndex.service";
import { UserProcessorShowService } from "@modules/processor/services/userProcessorShow.service";

// Target import
import { UserProcessorController } from "./userProcessor.controller";

describe("Controller: UserProcessorController", () => {
  const user = userFactory.build();
  const processor = processorFactory.build();

  const pagination = { skip: 0, take: 5 };
  const sorting = [{ field: "name", order: SORT_ORDER.ASC }];

  let userProcessorIndexService: { execute: ReturnType<typeof vi.fn> };
  let userProcessorShowService: { execute: ReturnType<typeof vi.fn> };

  let response: { json: ReturnType<typeof vi.fn> };

  let userProcessorController: UserProcessorController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      pagination,
      sorting,
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userProcessorIndexService = { execute: vi.fn() };
    userProcessorShowService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessorIndexService) return userProcessorIndexService;
      if (token === UserProcessorShowService) return userProcessorShowService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessorController = new UserProcessorController();
  });

  it("should index processors forwarding the request pagination and sorting without the language", async () => {
    const paginated = { edges: [], total_count: 0 };
    userProcessorIndexService.execute.mockResolvedValueOnce(paginated);

    const result = await userProcessorController.index(
      buildRequest(),
      response as unknown as Response,
    );

    expect(userProcessorIndexService.execute).toHaveBeenCalledWith({
      user,
      pagination,
      sorting,
    });
    expect(response.json).toHaveBeenCalledWith(process(paginated));
    expect(result).toBe(response);
  });

  it("should propagate a failure indexing processors", async () => {
    const error = new Error("index failed");
    userProcessorIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessorController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should show a processor by the route param", async () => {
    userProcessorShowService.execute.mockResolvedValueOnce(processor);

    const result = await userProcessorController.show(
      buildRequest({ params: { processor_id: processor.id } }),
      response as unknown as Response,
    );

    expect(userProcessorShowService.execute).toHaveBeenCalledWith({
      user,
      processor_id: processor.id,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(processor));
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a processor", async () => {
    const error = new Error("show failed");
    userProcessorShowService.execute.mockRejectedValueOnce(error);

    await expect(
      userProcessorController.show(
        buildRequest({ params: { processor_id: processor.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});
