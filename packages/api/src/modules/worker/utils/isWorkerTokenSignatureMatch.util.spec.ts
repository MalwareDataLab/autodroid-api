import { describe, expect, it } from "vitest";
import { JwtPayload } from "jsonwebtoken";

// Configuration import
import { getWorkerConfig } from "@config/worker";

// Util import
import { generateWorkerTokenPayload } from "./generateWorkerTokenPayload.util";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Test target import
import { isWorkerTokenSignatureMatch } from "./isWorkerTokenSignatureMatch.util";

const buildWorker = () => {
  const registration_token = workerRegistrationTokenFactory.build();
  return workerFactory.build({}, { associations: { registration_token } });
};

const { worker_access_token_audience, worker_refresh_token_audience } =
  getWorkerConfig();

describe("Utils: isWorkerTokenSignatureMatch", () => {
  it("should return true for a matching access token payload", () => {
    const worker = buildWorker();
    const jwtPayload: JwtPayload = {
      ...generateWorkerTokenPayload(worker),
      aud: worker_access_token_audience,
    };

    expect(isWorkerTokenSignatureMatch({ worker, jwtPayload })).toBe(true);
  });

  it("should return false for a non-matching access token payload", () => {
    const worker = buildWorker();
    const jwtPayload: JwtPayload = {
      registration_token: "mismatch",
      internal_id: "mismatch",
      signature: "mismatch",
      aud: worker_access_token_audience,
    };

    expect(isWorkerTokenSignatureMatch({ worker, jwtPayload })).toBe(false);
  });

  it("should return true for a matching refresh token payload", () => {
    const worker = buildWorker();
    const jwtPayload: JwtPayload = {
      ...generateWorkerTokenPayload(worker),
      aud: worker_refresh_token_audience,
    };

    expect(isWorkerTokenSignatureMatch({ worker, jwtPayload })).toBe(true);
  });

  it("should return false for a non-matching refresh token payload", () => {
    const worker = buildWorker();
    const jwtPayload: JwtPayload = {
      registration_token: "mismatch",
      internal_id: "mismatch",
      signature: "mismatch",
      aud: worker_refresh_token_audience,
    };

    expect(isWorkerTokenSignatureMatch({ worker, jwtPayload })).toBe(false);
  });

  it("should return false for an unknown audience", () => {
    const worker = buildWorker();
    const jwtPayload: JwtPayload = {
      ...generateWorkerTokenPayload(worker),
      aud: "unknown-audience",
    };

    expect(isWorkerTokenSignatureMatch({ worker, jwtPayload })).toBe(false);
  });
});
