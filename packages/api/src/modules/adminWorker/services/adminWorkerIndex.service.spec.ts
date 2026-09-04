import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Service import
import { AdminWorkerIndexService } from "./adminWorkerIndex.service";

describe("Service: AdminWorkerIndexService", () => {
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let adminWorkerIndexService: AdminWorkerIndexService;

  beforeEach(() => {
    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminWorkerIndexService = new AdminWorkerIndexService(workerRepositoryMock);
  });

  it("should list workers", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const worker = workerFactory.build(
      {},
      { transient: { withRelations: true } },
    );

    workerRepositoryMock.getCount.mockResolvedValueOnce(1);
    workerRepositoryMock.findMany.mockResolvedValueOnce([worker]);

    const response = await adminWorkerIndexService.execute({
      filter: {},
      user,
      language: "en",
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(worker),
          }),
        ]),
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminWorkerIndexService.execute({
        filter: {},
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
