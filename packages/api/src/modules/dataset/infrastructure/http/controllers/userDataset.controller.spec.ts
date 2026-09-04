import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";
import { Request, Response } from "express";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Util import
import { process } from "@shared/utils/instanceParser";

// Service import
import { UserDatasetCreateService } from "@modules/dataset/services/userDatasetCreate.service";
import { UserDatasetIndexService } from "@modules/dataset/services/userDatasetIndex.service";
import { UserDatasetShowService } from "@modules/dataset/services/userDatasetShow.service";
import { UserDatasetUpdateService } from "@modules/dataset/services/userDatasetUpdate.service";
import { UserDatasetDeleteService } from "@modules/dataset/services/userDatasetDelete.service";

// Target import
import { UserDatasetController } from "./userDataset.controller";

describe("Controller: UserDatasetController", () => {
  const user = userFactory.build();
  const dataset = datasetFactory.build();

  const agent_info = { ip: "127.0.0.1", browser: "vitest" };

  let userDatasetCreateService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetIndexService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetShowService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetUpdateService: { execute: ReturnType<typeof vi.fn> };
  let userDatasetDeleteService: { execute: ReturnType<typeof vi.fn> };

  let response: {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };

  let userDatasetController: UserDatasetController;

  const buildRequest = (overrides: Record<string, any> = {}) =>
    ({
      user_session: { user },
      language: "en",
      agent_info,
      params: {},
      query: {},
      body: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(() => {
    userDatasetCreateService = { execute: vi.fn() };
    userDatasetIndexService = { execute: vi.fn() };
    userDatasetShowService = { execute: vi.fn() };
    userDatasetUpdateService = { execute: vi.fn() };
    userDatasetDeleteService = { execute: vi.fn() };

    response = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === UserDatasetCreateService) return userDatasetCreateService;
      if (token === UserDatasetIndexService) return userDatasetIndexService;
      if (token === UserDatasetShowService) return userDatasetShowService;
      if (token === UserDatasetUpdateService) return userDatasetUpdateService;
      if (token === UserDatasetDeleteService) return userDatasetDeleteService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    userDatasetController = new UserDatasetController();
  });

  it("should create a dataset answering 201 with the picked upload fields and the agent info", async () => {
    userDatasetCreateService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetController.create(
      buildRequest({
        body: {
          filename: "dataset.zip",
          md5_hash: "d41d8cd98f00b204e9800998ecf8427e",
          mime_type: "application/zip",
          size: 1024,
          description: "a dataset",
          tags: "apk,malware",
          unexpected_field: "ignored",
        },
      }),
      response as unknown as Response,
    );

    expect(userDatasetCreateService.execute).toHaveBeenCalledWith({
      data: {
        filename: "dataset.zip",
        md5_hash: "d41d8cd98f00b204e9800998ecf8427e",
        mime_type: "application/zip",
        size: 1024,
        description: "a dataset",
        tags: "apk,malware",
      },
      user,
      agent_info,
      language: "en",
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure creating a dataset", async () => {
    const error = new Error("create failed");
    userDatasetCreateService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetController.create(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("should index the datasets of the session user only", async () => {
    const datasets = [dataset];
    userDatasetIndexService.execute.mockResolvedValueOnce(datasets);

    const result = await userDatasetController.index(
      buildRequest(),
      response as unknown as Response,
    );

    expect(userDatasetIndexService.execute).toHaveBeenCalledWith({ user });
    expect(response.json).toHaveBeenCalledWith(process(datasets));
    expect(result).toBe(response);
  });

  it("should propagate a failure indexing the datasets", async () => {
    const error = new Error("index failed");
    userDatasetIndexService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetController.index(
        buildRequest(),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should show a dataset by the route param", async () => {
    userDatasetShowService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetController.show(
      buildRequest({ params: { dataset_id: dataset.id } }),
      response as unknown as Response,
    );

    expect(userDatasetShowService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure showing a dataset", async () => {
    const error = new Error("show failed");
    userDatasetShowService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetController.show(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should update only the description and tags of a dataset", async () => {
    userDatasetUpdateService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetController.update(
      buildRequest({
        params: { dataset_id: dataset.id },
        body: { description: "edited", tags: "x", unexpected_field: "ignored" },
      }),
      response as unknown as Response,
    );

    expect(userDatasetUpdateService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      data: { description: "edited", tags: "x" },
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure updating a dataset", async () => {
    const error = new Error("update failed");
    userDatasetUpdateService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetController.update(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });

  it("should delete a dataset by the route param", async () => {
    userDatasetDeleteService.execute.mockResolvedValueOnce(dataset);

    const result = await userDatasetController.delete(
      buildRequest({ params: { dataset_id: dataset.id } }),
      response as unknown as Response,
    );

    expect(userDatasetDeleteService.execute).toHaveBeenCalledWith({
      dataset_id: dataset.id,
      user,
      language: "en",
    });
    expect(response.json).toHaveBeenCalledWith(process(dataset));
    expect(result).toBe(response);
  });

  it("should propagate a failure deleting a dataset", async () => {
    const error = new Error("delete failed");
    userDatasetDeleteService.execute.mockRejectedValueOnce(error);

    await expect(
      userDatasetController.delete(
        buildRequest({ params: { dataset_id: dataset.id } }),
        response as unknown as Response,
      ),
    ).rejects.toThrowError(error);
  });
});
