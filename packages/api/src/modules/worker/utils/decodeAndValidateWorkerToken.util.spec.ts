import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import jwt from "jsonwebtoken";

// Configuration import
import { getWorkerConfig } from "@config/worker";

// Util import
import {
  generateWorkerAccessToken,
  generateWorkerRefreshToken,
} from "./generateWorkerToken.util";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Test target import
import {
  verifyAndGetWorkerAccessTokenPayload,
  verifyAndGetWorkerRefreshTokenPayload,
  decodeAndGetWorkerAccessTokenPayload,
  decodeAndGetWorkerRefreshTokenPayload,
} from "./decodeAndValidateWorkerToken.util";

const buildWorker = () => {
  const registration_token = workerRegistrationTokenFactory.build();
  return workerFactory.build(
    { archived_at: null },
    { associations: { registration_token } },
  );
};

describe("Utils: decodeAndValidateWorkerToken", () => {
  it("should verify and return the access token payload", () => {
    const worker = buildWorker();
    const { token } = generateWorkerAccessToken(worker);

    const payload = verifyAndGetWorkerAccessTokenPayload({
      access_token: token,
    });

    expect(payload.worker_id).toBe(worker.id);
    expect(payload.sub).toBe(worker.id);
  });

  it("should verify and return the refresh token payload", () => {
    const worker = buildWorker();
    const { token } = generateWorkerRefreshToken(worker);

    const payload = verifyAndGetWorkerRefreshTokenPayload({
      refresh_token: token,
    });

    expect(payload.worker_id).toBe(worker.id);
  });

  it("should decode an expired access token ignoring expiration", () => {
    const worker = buildWorker();
    const { worker_access_token_secret } = getWorkerConfig();
    const token = jwt.sign({}, worker_access_token_secret, {
      subject: worker.id,
      expiresIn: -10,
    });

    const payload = decodeAndGetWorkerAccessTokenPayload({
      access_token: token,
    });

    expect(payload.worker_id).toBe(worker.id);
  });

  it("should decode an expired refresh token ignoring expiration", () => {
    const worker = buildWorker();
    const { worker_refresh_token_secret } = getWorkerConfig();
    const token = jwt.sign({}, worker_refresh_token_secret, {
      subject: worker.id,
      expiresIn: -10,
    });

    const payload = decodeAndGetWorkerRefreshTokenPayload({
      refresh_token: token,
    });

    expect(payload.worker_id).toBe(worker.id);
  });

  it("should throw when the subject is not a valid uuid", () => {
    const { worker_access_token_secret } = getWorkerConfig();
    const token = jwt.sign({}, worker_access_token_secret, {
      subject: "not-a-uuid",
    });

    expect(() =>
      verifyAndGetWorkerAccessTokenPayload({ access_token: token }),
    ).toThrowError(
      expect.objectContaining({
        key: "@process_and_validate_worker_token/MISSING_SUB",
      }),
    );
  });

  it("should throw when the subject is missing", () => {
    const { worker_access_token_secret } = getWorkerConfig();
    const token = jwt.sign({}, worker_access_token_secret);

    expect(() =>
      verifyAndGetWorkerAccessTokenPayload({ access_token: token }),
    ).toThrowError(
      expect.objectContaining({
        key: "@process_and_validate_worker_token/MISSING_SUB",
      }),
    );
  });

  it("should throw when the token is expired on verification", () => {
    const { worker_access_token_secret } = getWorkerConfig();
    const token = jwt.sign({}, worker_access_token_secret, {
      subject: faker.string.uuid(),
      expiresIn: -10,
    });

    expect(() =>
      verifyAndGetWorkerAccessTokenPayload({ access_token: token }),
    ).toThrowError(
      expect.objectContaining({
        key: "@process_and_validate_worker_token/INVALID_TOKEN",
      }),
    );
  });

  it("should throw when the token is malformed", () => {
    expect(() =>
      verifyAndGetWorkerRefreshTokenPayload({ refresh_token: "malformed" }),
    ).toThrowError(
      expect.objectContaining({
        key: "@process_and_validate_worker_token/INVALID_TOKEN",
      }),
    );
  });
});
