import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";

// Factory import
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Target import
import { AdminProcessorShowService } from "./adminProcessorShow.service";

describe("Service: AdminProcessorShowService", () => {
  let processorRepositoryMock: Mocked<IProcessorRepository>;

  let adminProcessorShowService: AdminProcessorShowService;

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

    adminProcessorShowService = new AdminProcessorShowService(
      processorRepositoryMock,
    );
  });

  it("should show a processor", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });
    const processor = processorFactory.build();

    processorRepositoryMock.findOne.mockResolvedValueOnce(processor);

    const response = await adminProcessorShowService.execute({
      processor_id: processor.id,
      user,
      language: "en",
    });

    expect(response).toMatchObject(processor);
  });

  it("should throw if the processor was not found", async () => {
    const user = userFactory.build({ email: "luiz@laviola.dev" });

    processorRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      adminProcessorShowService.execute({
        processor_id: faker.string.uuid(),
        user,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_processor_show_service/PROCESSOR_NOT_FOUND",
      }),
    );
  });

  it("should throw if the user is not an admin", () => {
    const user = userFactory.build();

    expect(() =>
      adminProcessorShowService.execute({
        processor_id: faker.string.uuid(),
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
