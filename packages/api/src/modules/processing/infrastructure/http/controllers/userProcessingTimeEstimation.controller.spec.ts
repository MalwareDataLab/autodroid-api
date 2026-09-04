import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserProcessingGetEstimatedExecutionTimeService } from "@modules/processing/services/userProcessingGetEstimatedExecutionTime.service";
import { UserProcessingGetEstimatedFinishDateService } from "@modules/processing/services/userProcessingGetEstimatedFinishDate.service";

// Target import
import { UserProcessingTimeEstimationController } from "./userProcessingTimeEstimation.controller";

describe("Controller: UserProcessingTimeEstimationController", () => {
  const user = userFactory.build();
  const processing = processingFactory.build();

  let userProcessingGetEstimatedExecutionTimeService: {
    execute: ReturnType<typeof vi.fn>;
  };
  let userProcessingGetEstimatedFinishDateService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let userProcessingTimeEstimationController: UserProcessingTimeEstimationController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      query: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userProcessingGetEstimatedExecutionTimeService = { execute: vi.fn() };
    userProcessingGetEstimatedFinishDateService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserProcessingGetEstimatedExecutionTimeService)
        return userProcessingGetEstimatedExecutionTimeService;
      if (token === UserProcessingGetEstimatedFinishDateService)
        return userProcessingGetEstimatedFinishDateService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userProcessingTimeEstimationController =
      new UserProcessingTimeEstimationController();
  });

  it("should show the estimated execution time stringifying the dataset and processor query params", async () => {
    const estimation = { estimated_execution_time_in_seconds: 120 };
    userProcessingGetEstimatedExecutionTimeService.execute.mockResolvedValueOnce(
      estimation,
    );

    const result =
      await userProcessingTimeEstimationController.showEstimatedExecution(
        buildRequest({
          query: { dataset_id: "dataset-id", processor_id: "processor-id" },
        }),
        response as unknown as Response,
      );

    expect(
      userProcessingGetEstimatedExecutionTimeService.execute,
    ).toHaveBeenCalledWith({
      user,
      dataset_id: "dataset-id",
      processor_id: "processor-id",
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(estimation));
    expect(result).toBe(response);
  });

  it("should coerce missing dataset and processor query params to the undefined string", async () => {
    userProcessingGetEstimatedExecutionTimeService.execute.mockResolvedValueOnce(
      {},
    );

    await userProcessingTimeEstimationController.showEstimatedExecution(
      buildRequest(),
      response as unknown as Response,
    );

    expect(
      userProcessingGetEstimatedExecutionTimeService.execute,
    ).toHaveBeenCalledWith({
      user,
      dataset_id: "undefined",
      processor_id: "undefined",
      language: "en",
    });
  });

  it("should propagate a failure estimating the execution time", async () => {
    const error = new Error("execution estimation failed");
    userProcessingGetEstimatedExecutionTimeService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      userProcessingTimeEstimationController.showEstimatedExecution(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it("should show the estimated finish date stringifying the processing route param", async () => {
    const estimation = { estimated_finish_date: new Date("2030-01-01") };
    userProcessingGetEstimatedFinishDateService.execute.mockResolvedValueOnce(
      estimation,
    );

    const result =
      await userProcessingTimeEstimationController.showEstimatedFinish(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      );

    expect(
      userProcessingGetEstimatedFinishDateService.execute,
    ).toHaveBeenCalledWith({
      user,
      processing_id: processing.id,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(estimation));
    expect(result).toBe(response);
  });

  it("should propagate a failure estimating the finish date", async () => {
    const error = new Error("finish estimation failed");
    userProcessingGetEstimatedFinishDateService.execute.mockRejectedValueOnce(
      error,
    );

    await expect(
      userProcessingTimeEstimationController.showEstimatedFinish(
        buildRequest({ params: { processing_id: processing.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});
