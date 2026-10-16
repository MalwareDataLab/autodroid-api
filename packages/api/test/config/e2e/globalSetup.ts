import { generateKeyPairSync } from "node:crypto";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import type { TestProject } from "vitest/node";

const STORAGE_EMULATOR_PORT = 4443;
const STORAGE_PROJECT_ID = "autodroid-e2e";
const STORAGE_BUCKET_NAME = "autodroid-e2e";

let storageEmulatorContainer: StartedTestContainer | undefined;

// eslint-disable-next-line import/no-default-export
export default async function setup(project: TestProject) {
  storageEmulatorContainer = await new GenericContainer(
    "fsouza/fake-gcs-server:1.52.2",
  )
    .withCommand(["-scheme", "http", "-port", String(STORAGE_EMULATOR_PORT)])
    .withExposedPorts(STORAGE_EMULATOR_PORT)
    .withWaitStrategy(
      Wait.forHttp("/storage/v1/b", STORAGE_EMULATOR_PORT).forStatusCode(200),
    )
    .start();

  const host = `http://${storageEmulatorContainer.getHost()}:${storageEmulatorContainer.getMappedPort(STORAGE_EMULATOR_PORT)}/storage/v1`;

  const bucketCreation = await fetch(
    `${host}/b?project=${STORAGE_PROJECT_ID}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: STORAGE_BUCKET_NAME }),
    },
  );

  if (!bucketCreation.ok)
    throw new Error(
      `Storage emulator bucket creation failed: ${bucketCreation.status} ${await bucketCreation.text()}`,
    );

  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  project.provide("storageEmulator", {
    host,
    projectId: STORAGE_PROJECT_ID,
    clientEmail: `e2e@${STORAGE_PROJECT_ID}.iam.gserviceaccount.com`,
    privateKey,
    bucketName: STORAGE_BUCKET_NAME,
  });

  return async () => {
    await storageEmulatorContainer?.stop();
  };
}
