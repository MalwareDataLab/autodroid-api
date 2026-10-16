import { describe, expect, it } from "vitest";

// Entity import
import { WorkerRegistrationToken } from "../entities/workerRegistrationToken.entity";

// Factory import
import { workerRegistrationTokenFactory } from "../entities/factories/workerRegistrationToken.factory";

// Target import
import { withoutWorkerRegistrationTokenValue } from "./withoutWorkerRegistrationTokenValue.util";

describe("Utils: withoutWorkerRegistrationTokenValue", () => {
  it("should return a registration token entity with every field but the token value", () => {
    const workerRegistrationToken = workerRegistrationTokenFactory.build();

    const result = withoutWorkerRegistrationTokenValue(workerRegistrationToken);

    expect(result).toBeInstanceOf(WorkerRegistrationToken);
    expect(result).toEqual({ ...workerRegistrationToken, token: null });
  });

  it("should leave the given registration token untouched", () => {
    const workerRegistrationToken = workerRegistrationTokenFactory.build();
    const tokenValue = workerRegistrationToken.token;

    const result = withoutWorkerRegistrationTokenValue(workerRegistrationToken);

    expect(result).not.toBe(workerRegistrationToken);
    expect(workerRegistrationToken.token).toBe(tokenValue);
    expect(tokenValue).toEqual(expect.any(String));
  });
});
