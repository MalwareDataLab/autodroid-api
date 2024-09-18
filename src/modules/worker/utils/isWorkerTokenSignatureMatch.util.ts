import { JwtPayload } from "jsonwebtoken";

// Config import
import { getAuthConfig } from "@config/auth";

// Util import
import { generateWorkerTokenPayload } from "./generateWorkerTokenPayload.util";

// Entity import
import { Worker } from "../entities/worker.entity";

// Type import
import { WorkerAccessTokenPayloadInternalFields } from "../types/workerTokenPayload.type";

const isWorkerTokenSignatureMatch = ({
  worker,
  jwtPayload,
}: {
  worker: Worker;
  jwtPayload: JwtPayload;
}): boolean => {
  const authConfig = getAuthConfig();

  const tokenPayload = {
    registration_token: jwtPayload.registration_token,
    internal_id: jwtPayload.internal_id,
    signature: jwtPayload.signature,
    refresh_token: jwtPayload.refresh_token,
  } satisfies WorkerAccessTokenPayloadInternalFields;

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
