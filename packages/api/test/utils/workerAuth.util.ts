import { createHash } from "node:crypto";
import { faker } from "@faker-js/faker";
import { container } from "tsyringe";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

// Util import
import {
  generateWorkerAccessToken,
  generateWorkerRefreshToken,
} from "@modules/worker/utils/generateWorkerToken.util";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

export const sha256Hash = () =>
  createHash("sha256").update(faker.string.alphanumeric(16)).digest("hex");

export const createAuthorizedWorker = async (
  overrides: Partial<Worker> = {},
): Promise<{
  worker: Worker;
  registrationToken: WorkerRegistrationToken;
  accessToken: string;
}> => {
  const registrationToken = await workerRegistrationTokenFactory.create();
  const worker = await workerFactory.create(
    {
      internal_id: faker.string.uuid(),
      signature: sha256Hash(),
      refresh_token: "",
      ...overrides,
    },
    { associations: { registration_token: registrationToken } },
  );

  const { token: accessToken } = generateWorkerAccessToken(worker);

  return { worker, registrationToken, accessToken };
};

export const createWorkerWithRefreshToken = async (): Promise<{
  worker: Worker;
  registrationToken: WorkerRegistrationToken;
  refreshToken: string;
}> => {
  const registrationToken = await workerRegistrationTokenFactory.create();
  const worker = await workerFactory.create(
    {
      internal_id: faker.string.uuid(),
      signature: sha256Hash(),
    },
    { associations: { registration_token: registrationToken } },
  );

  const { token: refreshToken } = generateWorkerRefreshToken(worker);

  const workerRepository =
    container.resolve<IWorkerRepository>("WorkerRepository");

  const updatedWorker = await workerRepository.updateOne(
    { id: worker.id },
    { refresh_token: refreshToken },
  );

  return {
    worker: updatedWorker || worker,
    registrationToken,
    refreshToken,
  };
};
