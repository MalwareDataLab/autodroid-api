import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Service import
import { AdminWorkerRegistrationTokenIndexService } from "./adminWorkerRegistrationTokenIndex.service";

describe("Service: AdminWorkerRegistrationTokenIndexService", () => {
  let workerRegistrationTokenRepositoryMock: Mocked<IWorkerRegistrationTokenRepository>;

  let adminWorkerRegistrationTokenIndexService: AdminWorkerRegistrationTokenIndexService;

  beforeEach(() => {
    workerRegistrationTokenRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminWorkerRegistrationTokenIndexService =
      new AdminWorkerRegistrationTokenIndexService(
        workerRegistrationTokenRepositoryMock,
      );
  });

  it("should list worker registration tokens", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const workerRegistrationToken = workerRegistrationTokenFactory.build(
      {},
      { transient: { withRelations: true } },
    );

    workerRegistrationTokenRepositoryMock.getCount.mockResolvedValueOnce(1);
    workerRegistrationTokenRepositoryMock.findMany.mockResolvedValueOnce([
      workerRegistrationToken,
    ]);

    const response = await adminWorkerRegistrationTokenIndexService.execute({
      filter: {},
      user,
      language: "en",
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(workerRegistrationToken),
          }),
        ]),
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminWorkerRegistrationTokenIndexService.execute({
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
