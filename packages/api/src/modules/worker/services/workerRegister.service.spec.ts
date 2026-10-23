import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";

// Schema import
import { WorkerRegisterSchema } from "@modules/worker/schemas/worker.schema";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Target import
import { WorkerRegisterService } from "./workerRegister.service";

describe("Service: WorkerRegisterService", () => {
  let workerRegistrationTokenRepositoryMock: Mocked<IWorkerRegistrationTokenRepository>;
  let workerRepositoryMock: Mocked<IWorkerRepository>;

  let workerRegisterService: WorkerRegisterService;

  const buildRequestData = (
    registration_token_value: string,
  ): WorkerRegisterSchema => ({
    system_info: {},
    registration_token: registration_token_value,
    internal_id: "internal-id",
    signature: "signature",
    name: "worker-name",
  });

  beforeEach(() => {
    workerRegistrationTokenRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      activateOne: vi.fn(),
      releaseOne: vi.fn(),
    };

    workerRepositoryMock = {
      createOne: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      getCount: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };

    workerRegisterService = new WorkerRegisterService(
      workerRegistrationTokenRepositoryMock,
      workerRepositoryMock,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should register a worker", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { refresh_token: "", archived_at: null },
      { associations: { registration_token } },
    );
    const updatedWorker = workerFactory.build(
      { archived_at: null },
      { associations: { registration_token } },
    );

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRegistrationTokenRepositoryMock.activateOne.mockResolvedValueOnce(
      true,
    );
    workerRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(worker);
    workerRepositoryMock.createOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(updatedWorker);

    const response = await workerRegisterService.execute({
      data: buildRequestData(registration_token.token),
    });

    expect(response).toBe(updatedWorker);
    expect(workerRegistrationTokenRepositoryMock.findOne).toHaveBeenCalledWith({
      token: registration_token.token,
      archived: false,
    });
    expect(
      workerRegistrationTokenRepositoryMock.activateOne,
    ).toHaveBeenCalledWith({ id: registration_token.id });
  });

  it("should register a worker with a token that expires in the future", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.useFakeTimers({ now, toFake: ["Date"] });
    const registration_token = workerRegistrationTokenFactory.build({
      expires_at: new Date(now.getTime() + 1),
    });
    const worker = workerFactory.build(
      { refresh_token: "", archived_at: null },
      { associations: { registration_token } },
    );

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRegistrationTokenRepositoryMock.activateOne.mockResolvedValueOnce(
      true,
    );
    workerRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(worker);
    workerRepositoryMock.createOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.updateOne.mockResolvedValueOnce(worker);

    const response = await workerRegisterService.execute({
      data: buildRequestData(registration_token.token),
    });

    expect(response).toBe(worker);
  });

  it.each([
    ["expires exactly now", 0],
    ["expired in the past", -1],
  ])(
    "should throw if the registration token %s",
    async (_label, offsetMilliseconds) => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      vi.useFakeTimers({ now, toFake: ["Date"] });
      const registration_token = workerRegistrationTokenFactory.build({
        expires_at: new Date(now.getTime() + offsetMilliseconds),
      });

      workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
        registration_token,
      );

      await expect(() =>
        workerRegisterService.execute({
          data: buildRequestData(registration_token.token),
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          key: "@worker_register_service/REGISTRATION_TOKEN_EXPIRED",
        }),
      );
      expect(
        workerRegistrationTokenRepositoryMock.activateOne,
      ).not.toHaveBeenCalled();
      expect(workerRepositoryMock.createOne).not.toHaveBeenCalled();
    },
  );

  it("should throw if the single-use registration token was already used", async () => {
    const registration_token = workerRegistrationTokenFactory.build({
      activated_at: new Date(),
    });

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRepositoryMock.findOne.mockResolvedValueOnce(null);
    workerRegistrationTokenRepositoryMock.activateOne.mockResolvedValueOnce(
      false,
    );

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/REGISTRATION_TOKEN_ALREADY_USED",
      }),
    );
    expect(workerRepositoryMock.createOne).not.toHaveBeenCalled();
  });

  it("should throw if the registration token was not found", async () => {
    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData("missing-token"),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/REGISTRATION_TOKEN_NOT_FOUND",
      }),
    );
  });

  it("should throw if the signature was already used", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const existingWorker = workerFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRepositoryMock.findOne.mockResolvedValueOnce(existingWorker);

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/SIGNATURE_ALREADY_USED",
      }),
    );
  });

  it("should rethrow an app error raised while updating the refresh token", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { refresh_token: "", archived_at: null },
      { associations: { registration_token } },
    );

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRegistrationTokenRepositoryMock.activateOne.mockResolvedValueOnce(
      true,
    );
    workerRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    workerRepositoryMock.createOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.deleteOne.mockResolvedValueOnce(worker);
    workerRegistrationTokenRepositoryMock.releaseOne.mockResolvedValueOnce();

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_NOT_FOUND",
      }),
    );
    expect(workerRepositoryMock.deleteOne).toHaveBeenCalledWith({
      id: worker.id,
    });
    expect(
      workerRegistrationTokenRepositoryMock.releaseOne,
    ).toHaveBeenCalledWith({ id: registration_token.id });
  });

  it("should throw a generic error when an unexpected error occurs", async () => {
    const registration_token = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRegistrationTokenRepositoryMock.activateOne.mockResolvedValueOnce(
      true,
    );
    workerRepositoryMock.findOne.mockResolvedValueOnce(null);
    workerRepositoryMock.createOne.mockRejectedValueOnce(new Error("db down"));
    workerRegistrationTokenRepositoryMock.releaseOne.mockResolvedValueOnce();

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/FAIL_TO_REGISTER_WORKER",
      }),
    );
    expect(workerRepositoryMock.deleteOne).not.toHaveBeenCalled();
    expect(
      workerRegistrationTokenRepositoryMock.releaseOne,
    ).toHaveBeenCalledWith({ id: registration_token.id });
  });

  it("should keep the token consumed and surface the original error when archiving the created worker fails", async () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      { refresh_token: "", archived_at: null },
      { associations: { registration_token } },
    );

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRegistrationTokenRepositoryMock.activateOne.mockResolvedValueOnce(
      true,
    );
    workerRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    workerRepositoryMock.createOne.mockResolvedValueOnce(worker);
    workerRepositoryMock.deleteOne.mockRejectedValueOnce(new Error("db down"));

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_update_refresh_token_service/WORKER_NOT_FOUND",
      }),
    );
    expect(workerRepositoryMock.deleteOne).toHaveBeenCalledWith({
      id: worker.id,
    });
    expect(
      workerRegistrationTokenRepositoryMock.releaseOne,
    ).not.toHaveBeenCalled();
  });

  it("should surface the original error when releasing the token fails", async () => {
    const registration_token = workerRegistrationTokenFactory.build();

    workerRegistrationTokenRepositoryMock.findOne.mockResolvedValueOnce(
      registration_token,
    );
    workerRegistrationTokenRepositoryMock.activateOne.mockResolvedValueOnce(
      true,
    );
    workerRepositoryMock.findOne.mockResolvedValueOnce(null);
    workerRepositoryMock.createOne.mockRejectedValueOnce(new Error("db down"));
    workerRegistrationTokenRepositoryMock.releaseOne.mockRejectedValueOnce(
      new Error("release failed"),
    );

    await expect(() =>
      workerRegisterService.execute({
        data: buildRequestData(registration_token.token),
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@worker_register_service/FAIL_TO_REGISTER_WORKER",
        debug: expect.objectContaining({
          error: expect.objectContaining({ message: "db down" }),
        }),
      }),
    );
    expect(
      workerRegistrationTokenRepositoryMock.releaseOne,
    ).toHaveBeenCalledWith({ id: registration_token.id });
  });
});
