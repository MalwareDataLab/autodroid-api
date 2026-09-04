import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { AdminProcessingEstimatedExecutionTimeIndexService } from "@modules/adminProcessing/services/adminProcessingEstimatedExecutionTimeIndex.service";

// Target import
import { AdminProcessingTimeEstimationController } from "./adminProcessingTimeEstimation.controller";

describe("Controller: AdminProcessingTimeEstimationController", () => {
  const user = userFactory.build();

  let adminProcessingEstimatedExecutionTimeIndexService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let adminProcessingTimeEstimationController: AdminProcessingTimeEstimationController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      query: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    adminProcessingEstimatedExecutionTimeIndexService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminProcessingEstimatedExecutionTimeIndexService)
        return adminProcessingEstimatedExecutionTimeIndexService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminProcessingTimeEstimationController =
      new AdminProcessingTimeEstimationController();
  });

  it("should index the estimations stringifying the dataset and processor query filters", async () => {
    const estimations = [{ processor_id: "processor-id", seconds: 42 }];
    const request = buildRequest({
      query: { dataset_id: "dataset-id", processor_id: "processor-id" },
    });
    adminProcessingEstimatedExecutionTimeIndexService.execute.mockResolvedValueOnce(
      estimations,
    );

    const result =
      await adminProcessingTimeEstimationController.showEstimatedExecution(
        request,
        response as unknown as Response,
      );

    expect(
      adminProcessingEstimatedExecutionTimeIndexService.execute,
    ).toHaveBeenCalledWith({
      user,
      filter: {
        dataset_id: "dataset-id",
        processor_id: "processor-id",
      },
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(estimations));
    expect(result).toBe(response);
  });

  it("should coerce missing dataset and processor query filters to the undefined string", async () => {
    adminProcessingEstimatedExecutionTimeIndexService.execute.mockResolvedValueOnce(
      [],
    );

    await adminProcessingTimeEstimationController.showEstimatedExecution(
      buildRequest(),
      response as unknown as Response,
    );

    expect(
      adminProcessingEstimatedExecutionTimeIndexService.execute,
    ).toHaveBeenCalledWith({
      user,
      filter: { dataset_id: "undefined", processor_id: "undefined" },
      language: "en",
    });
  });

  it("should propagate a failure indexing the estimations", async () => {
    const error = new Error("estimation failed");
    adminProcessingEstimatedExecutionTimeIndexService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      adminProcessingTimeEstimationController.showEstimatedExecution(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
