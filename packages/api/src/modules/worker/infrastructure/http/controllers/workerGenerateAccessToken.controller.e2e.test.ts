import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { createWorkerWithRefreshToken } from "@/test/utils/workerAuth.util";

describe("E2E: WorkerGenerateAccessTokenController", () => {
  it("should generate a worker access token", async context => {
    const { worker, registrationToken, refreshToken } =
      await createWorkerWithRefreshToken();

    const response = await context.request.post("/worker/access-token").send({
      system_info: worker.system_info,
      registration_token: registrationToken.token,
      internal_id: worker.internal_id,
      signature: worker.signature,
      name: worker.name,
      worker_id: worker.id,
      refresh_token: refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.body.access_token).toBeTruthy();
    expect(response.body.access_token_expires_at).toBeTruthy();
  });

  it("should fail generating an access token when the worker is not found", async context => {
    const { worker, registrationToken, refreshToken } =
      await createWorkerWithRefreshToken();

    const response = await context.request.post("/worker/access-token").send({
      system_info: worker.system_info,
      registration_token: registrationToken.token,
      internal_id: worker.internal_id,
      signature: worker.signature,
      name: worker.name,
      worker_id: faker.string.uuid(),
      refresh_token: refreshToken,
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_generate_access_token_service/WORKER_NOT_FOUND",
    });
  });
});
