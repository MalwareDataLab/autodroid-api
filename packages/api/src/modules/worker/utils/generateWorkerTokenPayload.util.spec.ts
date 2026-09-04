import { describe, expect, it } from "vitest";

// Util import
import { generateHash } from "@shared/utils/generateHash";

// Factory import
import { workerFactory } from "../entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Test target import
import { generateWorkerTokenPayload } from "./generateWorkerTokenPayload.util";

describe("Utils: generateWorkerTokenPayload", () => {
  it("should build a payload with hashed worker fields", () => {
    const registration_token = workerRegistrationTokenFactory.build();
    const worker = workerFactory.build(
      {},
      { associations: { registration_token } },
    );

    const payload = generateWorkerTokenPayload(worker);

    expect(payload).toEqual({
      registration_token: generateHash(worker.registration_token.token),
      internal_id: generateHash(worker.internal_id),
      signature: generateHash(worker.signature),
    });
  });
});
