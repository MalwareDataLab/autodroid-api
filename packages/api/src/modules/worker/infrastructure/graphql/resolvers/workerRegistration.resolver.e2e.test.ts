import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { gql } from "@/test/utils/gql.util";
import {
  createWorkerWithRefreshToken,
  sha256Hash,
} from "@/test/utils/workerAuth.util";
import { generateToken } from "@shared/utils/generateToken";

// Factory import
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

const REGISTER_MUTATION = gql`
  mutation WorkerRegister(
    $system_info: JSON!
    $registration_token: String!
    $internal_id: String!
    $signature: String!
    $name: String!
  ) {
    workerRegister(
      system_info: $system_info
      registration_token: $registration_token
      internal_id: $internal_id
      signature: $signature
      name: $name
    ) {
      id
      registration_token_id
      refresh_token
    }
  }
`;

describe("E2E: WorkerRegistrationResolver", () => {
  it("should register a worker", async context => {
    const registrationToken = await workerRegistrationTokenFactory.create();

    const response = await context.request.post("/graphql").send({
      query: REGISTER_MUTATION,
      variables: {
        system_info: { os: "Linux" },
        registration_token: registrationToken.token,
        internal_id: faker.string.uuid(),
        signature: sha256Hash(),
        name: faker.word.words(1),
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerRegister).toMatchObject({
      registration_token_id: registrationToken.id,
    });
    expect(response.body.data.workerRegister.refresh_token).toBeTruthy();
  });

  it("should fail registering with a registration token not found", async context => {
    const response = await context.request.post("/graphql").send({
      query: REGISTER_MUTATION,
      variables: {
        system_info: { os: "Linux" },
        registration_token: generateToken(),
        internal_id: faker.string.uuid(),
        signature: sha256Hash(),
        name: faker.word.words(1),
      },
    });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@worker_register_service/REGISTRATION_TOKEN_NOT_FOUND",
          },
        }),
      ]),
    );
    expect(response.body.data).toBeNull();
  });

  it("should update the worker refresh token", async context => {
    const { worker, registrationToken, refreshToken } =
      await createWorkerWithRefreshToken();

    const response = await context.request.post("/graphql").send({
      query: gql`
        mutation WorkerUpdateRefreshToken(
          $system_info: JSON!
          $registration_token: String!
          $internal_id: String!
          $signature: String!
          $name: String!
          $worker_id: String!
          $refresh_token: String!
        ) {
          workerUpdateRefreshToken(
            system_info: $system_info
            registration_token: $registration_token
            internal_id: $internal_id
            signature: $signature
            name: $name
            worker_id: $worker_id
            refresh_token: $refresh_token
          ) {
            id
            refresh_token
          }
        }
      `,
      variables: {
        system_info: worker.system_info,
        registration_token: registrationToken.token,
        internal_id: worker.internal_id,
        signature: worker.signature,
        name: worker.name,
        worker_id: worker.id,
        refresh_token: refreshToken,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.workerUpdateRefreshToken).toMatchObject({
      id: worker.id,
    });
  });

  it("should update the worker access token", async context => {
    const { worker, registrationToken, refreshToken } =
      await createWorkerWithRefreshToken();

    const response = await context.request.post("/graphql").send({
      query: gql`
        mutation WorkerUpdateAccessToken(
          $system_info: JSON!
          $registration_token: String!
          $internal_id: String!
          $signature: String!
          $name: String!
          $worker_id: String!
          $refresh_token: String!
        ) {
          workerUpdateAccessToken(
            system_info: $system_info
            registration_token: $registration_token
            internal_id: $internal_id
            signature: $signature
            name: $name
            worker_id: $worker_id
            refresh_token: $refresh_token
          ) {
            access_token
            access_token_expires_at
          }
        }
      `,
      variables: {
        system_info: worker.system_info,
        registration_token: registrationToken.token,
        internal_id: worker.internal_id,
        signature: worker.signature,
        name: worker.name,
        worker_id: worker.id,
        refresh_token: refreshToken,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(
      response.body.data.workerUpdateAccessToken.access_token,
    ).toBeTruthy();
  });
});
