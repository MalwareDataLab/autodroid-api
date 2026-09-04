import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import {
  createWorkerWithRefreshToken,
  sha256Hash,
} from "@/test/utils/workerAuth.util";

// Factory import
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

describe("E2E: WorkerUpdateRefreshTokenController", () => {
  it("should update the worker refresh token", async context => {
    const { worker, registrationToken, refreshToken } =
      await createWorkerWithRefreshToken();

    const response = await context.request.post("/worker/refresh-token").send({
      system_info: worker.system_info,
      registration_token: registrationToken.token,
      internal_id: worker.internal_id,
      signature: worker.signature,
      name: worker.name,
      worker_id: worker.id,
      refresh_token: refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: worker.id });
    expect(response.body.refresh_token).toBeTruthy();
  });

  it("should fail updating the refresh token when the worker is not found", async context => {
    const registrationToken = await workerRegistrationTokenFactory.create();

    const response = await context.request.post("/worker/refresh-token").send({
      system_info: { os: "Linux" },
      registration_token: registrationToken.token,
      internal_id: faker.string.uuid(),
      signature: sha256Hash(),
      name: faker.word.words(1),
      worker_id: faker.string.uuid(),
      refresh_token: faker.internet.jwt(),
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_update_refresh_token_service/WORKER_NOT_FOUND",
    });
  });
});
