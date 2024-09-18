// Util import
import { generateHash } from "@shared/utils/generateHash";

// Entity import
import { Worker } from "../entities/worker.entity";

const generateWorkerTokenPayload = (worker: Worker) => ({
  registration_token: generateHash(worker.registration_token.token),
  internal_id: generateHash(worker.internal_id),
  signature: generateHash(worker.signature),
  refresh_token: generateHash(worker.refresh_token),
});

export { generateWorkerTokenPayload };
