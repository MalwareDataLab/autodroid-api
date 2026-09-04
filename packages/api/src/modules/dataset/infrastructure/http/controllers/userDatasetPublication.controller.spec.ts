import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserDatasetRequestPublicationService } from "@modules/dataset/services/userDatasetRequestPublication.service";

// Target import
import { UserDatasetPublicationController } from "./userDatasetPublication.controller";

describe("Controller: UserDatasetPublicationController", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build();

  let userDatasetRequestPublicationService: {
    execute: ReturnType<typeof vi.fn>;
  };

  let response: { json: ReturnType<typeof vi.fn> };

  let userDatasetPublicationController: UserDatasetPublicationController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      params: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userDatasetRequestPublicationService = { execute: vi.fn() };

    response = { json: vi.fn().mockReturnThis() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserDatasetRequestPublicationService)
        return userDatasetRequestPublicationService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userDatasetPublicationController = new UserDatasetPublicationController();
  });

  it("should request the publication of the dataset in the route param", async () => {
    userDatasetRequestPublicationService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetPublicationController.update(
      buildRequest({ params: { dataset_id: dataset.id } }),
      response as unknown as Response,
    );

    expect(userDatasetRequestPublicationService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure requesting the dataset publication", async () => {
    const error = new Error("publication failed");
    userDatasetRequestPublicationService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetPublicationController.update(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
