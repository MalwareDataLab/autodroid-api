// Entity import
import { WorkerRegistrationToken } from "../entities/workerRegistrationToken.entity";

const withoutWorkerRegistrationTokenValue = (
  workerRegistrationToken: WorkerRegistrationToken,
): WorkerRegistrationToken =>
  Object.assign(new WorkerRegistrationToken(), workerRegistrationToken, {
    token: null,
  });

export { withoutWorkerRegistrationTokenValue };
