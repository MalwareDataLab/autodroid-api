import { JwtPayload } from "jsonwebtoken";

// Configuration import
import { getWorkerConfig } from "@config/worker";

// Util import
import { generateWorkerTokenPayload } from "./generateWorkerTokenPayload.util";

// Type import
import { WorkerTokenPayloadInternalFields } from "../types/workerTokenPayload.type";

// Entity import
import { Worker } from "../entities/worker.entity";

const isWorkerTokenSignatureMatch = ({
  worker,
  jwtPayload,
}: {
  worker: Worker;
  jwtPayload: JwtPayload;
}): boolean => {
  const authConfig = getWorkerConfig();

  const tokenPayload = {
    registration_token: jwtPayload.registration_token,
    internal_id: jwtPayload.internal_id,
    signature: jwtPayload.signature,
  } satisfies WorkerTokenPayloadInternalFields;

  const internalPayload = generateWorkerTokenPayload(worker);

  if (jwtPayload.aud === authConfig.worker_access_token_audience) {
    return JSON.stringify(tokenPayload) === JSON.stringify(internalPayload);
  }

  if (jwtPayload.aud === authConfig.worker_refresh_token_audience) {
    return (
      JSON.stringify({
        ...tokenPayload,
        refresh_token: undefined,
      }) ===
      JSON.stringify({
        ...internalPayload,
        refresh_token: undefined,
      })
    );
  }

  return false;
};

export { isWorkerTokenSignatureMatch };
