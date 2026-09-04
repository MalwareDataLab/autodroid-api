import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { sha256Hash } from "@/test/utils/workerAuth.util";
import { generateToken } from "@shared/utils/generateToken";

// Factory import
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

describe("E2E: WorkerRegisterController", () => {
  it("should register a worker", async context => {
    const registrationToken = await workerRegistrationTokenFactory.create();

    const response = await context.request.post("/worker/register").send({
      system_info: { os: "Linux" },
      registration_token: registrationToken.token,
      internal_id: faker.string.uuid(),
      signature: sha256Hash(),
      name: faker.word.words(1),
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      registration_token_id: registrationToken.id,
    });
    expect(response.body.refresh_token).toBeTruthy();
  });

  it("should fail registering with a registration token that was not found", async context => {
    const response = await context.request.post("/worker/register").send({
      system_info: { os: "Linux" },
      registration_token: generateToken(),
      internal_id: faker.string.uuid(),
      signature: sha256Hash(),
      name: faker.word.words(1),
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_register_service/REGISTRATION_TOKEN_NOT_FOUND",
    });
  });

  it("should fail registering with a signature already used", async context => {
    const registrationToken = await workerRegistrationTokenFactory.create();
    const signature = sha256Hash();
    await workerFactory.create({ signature, archived_at: null });

    const response = await context.request.post("/worker/register").send({
      system_info: { os: "Linux" },
      registration_token: registrationToken.token,
      internal_id: faker.string.uuid(),
      signature,
      name: faker.word.words(1),
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "@worker_register_service/SIGNATURE_ALREADY_USED",
    });
  });
});
