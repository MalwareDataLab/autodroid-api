import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Test target import
import {
  generateWorkerAccessToken,
  generateWorkerRefreshToken,
} from "./generateWorkerToken.util";

const buildWorker = () => {
  const registration_token = workerRegistrationTokenFactory.build();
  return workerFactory.build(
    { archived_at: null },
    { associations: { registration_token } },
  );
};

describe("Utils: generateWorkerToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should generate an access token with an expiration date", () => {
    const result = generateWorkerAccessToken(buildWorker());

    expect(result.token).toBeTypeOf("string");
    expect(result.expires_at).toBeInstanceOf(Date);
  });

  it("should generate a refresh token with an expiration date", () => {
    const result = generateWorkerRefreshToken(buildWorker());

    expect(result.token).toBeTypeOf("string");
    expect(result.expires_at).toBeInstanceOf(Date);
  });

  it("should throw when the generated token has no expiration", () => {
    vi.spyOn(jwt, "decode").mockReturnValueOnce({});

    expect(() => generateWorkerAccessToken(buildWorker())).toThrowError(
      expect.objectContaining({
        key: "@generate_worker_token/INVALID_TOKEN",
      }),
    );
  });
});
