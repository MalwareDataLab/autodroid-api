import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";

// Repository import
import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";

// Service import
import { AdminProcessorIndexService } from "./adminProcessorIndex.service";

describe("Service: AdminProcessorIndexService", () => {
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let adminProcessorIndexService: AdminProcessorIndexService;

  beforeEach(() => {
    processorRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findManyPublicOrUserPrivate: vi.fn(),
      getAllowedMimeTypes: vi.fn(),
      getCount: vi.fn(),
      getCountPublicOrUserPrivate: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    adminProcessorIndexService = new AdminProcessorIndexService(
      processorRepositoryMock,
    );
  });

  it("should list processors", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processor = processorFactory.build();

    processorRepositoryMock.getCount.mockResolvedValueOnce(1);
    processorRepositoryMock.findMany.mockResolvedValueOnce([processor]);

    const response = await adminProcessorIndexService.execute({
      user,
      language: "en",
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(processor),
          }),
        ]),
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessorIndexService.execute({
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
