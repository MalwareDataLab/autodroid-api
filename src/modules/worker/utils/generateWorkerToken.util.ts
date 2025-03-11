import jwt from "jsonwebtoken";

// Configuration import
import { getWorkerConfig } from "@config/worker";
import { getEnvConfig } from "@config/env";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";
import { generateWorkerTokenPayload } from "./generateWorkerTokenPayload.util";

// Entity import
import { Worker } from "../entities/worker.entity";

const generateWorkerToken = (worker: Worker, type: "REFRESH" | "ACCESS") => {
  const envConfig = getEnvConfig();
  const authConfig = getWorkerConfig();

  const config = {
    REFRESH: {
      secret: authConfig.worker_refresh_token_secret,
      expiration: authConfig.worker_refresh_token_expiration,
      audience: authConfig.worker_refresh_token_audience,
    },
    ACCESS: {
      secret: authConfig.worker_access_token_secret,
      expiration: authConfig.worker_access_token_expiration,
      audience: authConfig.worker_access_token_audience,
    },
  }[type];

  const payload = generateWorkerTokenPayload(worker);

  const token = jwt.sign(payload, config.secret, {
    algorithm: "HS256",
    expiresIn: config.expiration,
    subject: worker.id,
    issuer: envConfig.APP_INFO.name,
    audience: config.audience,
  });

  const info = jwt.decode(token, { json: true });

  if (!info?.exp)
    throw new AppError({
      key: "@generate_worker_token/INVALID_TOKEN",
      message: "Invalid token generated.",
      debug: { token, info },
    });

  return {
    token,
    expires_at: DateUtils.adapter.unix(info.exp).toDate(),
  };
};

const generateWorkerRefreshToken = (worker: Worker) =>
  generateWorkerToken(worker, "REFRESH");

const generateWorkerAccessToken = (worker: Worker) =>
  generateWorkerToken(worker, "ACCESS");

export { generateWorkerRefreshToken, generateWorkerAccessToken };
