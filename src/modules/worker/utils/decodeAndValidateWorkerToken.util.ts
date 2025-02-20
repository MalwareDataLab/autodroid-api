import jwt, { JwtPayload } from "jsonwebtoken";
import { isUUID } from "validator";

// i18n import
import { t } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Configuration import
import { getAuthConfig } from "@config/auth";

// Type import
import {
  WorkerAccessTokenPayload,
  WorkerRefreshTokenPayload,
} from "../types/workerTokenPayload.type";

type PayloadWithWorkerId<T> = T & { worker_id: string };

const processAndValidateWorkerToken = <T>({
  token,
  action,
  kind,
}: {
  token: string;
  action: "VERIFY" | "DECODE";
  kind: "ACCESS" | "REFRESH";
}): PayloadWithWorkerId<T> => {
  const authConfig = getAuthConfig();

  try {
    const secret =
      kind === "ACCESS"
        ? authConfig.worker_access_token_secret
        : authConfig.worker_refresh_token_secret;
    const payload = (
      action === "VERIFY" ? jwt.verify(token, secret) : jwt.decode(token)
    ) as JwtPayload & T;

    const worker_id = payload.sub;

    if (!worker_id || !isUUID(worker_id))
      throw new AppError({
        key: "@process_and_validate_worker_token/MISSING_SUB",
        message: t(
          "@process_and_validate_worker_token/MISSING_SUB",
          `Invalid ${kind.toLocaleLowerCase()} token sub.`,
        ),
      });

    return {
      ...payload,
      worker_id,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError({
      key: "@process_and_validate_worker_token/INVALID_TOKEN",
      message: t(
        "@process_and_validate_worker_token/INVALID_TOKEN",
        `Invalid or expired ${kind.toLocaleLowerCase()} token.`,
      ),
    });
  }
};

const verifyAndGetWorkerAccessTokenPayload = ({
  access_token,
}: {
  access_token: string;
}): PayloadWithWorkerId<WorkerAccessTokenPayload> => {
  const payload = processAndValidateWorkerToken<WorkerAccessTokenPayload>({
    action: "VERIFY",
    kind: "ACCESS",
    token: access_token,
  });

  return payload;
};

const verifyAndGetWorkerRefreshTokenPayload = ({
  refresh_token,
}: {
  refresh_token: string;
}): PayloadWithWorkerId<WorkerRefreshTokenPayload> => {
  const payload = processAndValidateWorkerToken<WorkerRefreshTokenPayload>({
    action: "VERIFY",
    kind: "REFRESH",
    token: refresh_token,
  });

  return payload;
};

export {
  verifyAndGetWorkerAccessTokenPayload,
  verifyAndGetWorkerRefreshTokenPayload,
};
