import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";

// Server util import
import { disposeServer, getServer } from "@/test/utils/getServer.util";
import { getFirebaseTestCredentials } from "@/test/utils/getFirebaseTestCredentials.util";
import { startAndGetSessionToken } from "@/test/utils/startAndGetSessionToken.util";

// Container import
import {
  initAndWaitRequisites,
  initSecondaryProviders,
} from "@shared/container";

const SDK_CJS_PATH = fileURLToPath(
  new URL("../../../../../autodroid-sdk/dist/index.cjs", import.meta.url),
);

type Page = { edges: unknown[]; totalCount: number };

type AutoDroidSdkCtor = new (params: {
  baseUrl: string;
  getAuthToken?: () => Promise<string>;
  onAuthError?: () => void;
}) => {
  healthCheck: {
    healthCheck: (variables: Record<string, never>) => Promise<Date>;
    livenessCheck: (variables: Record<string, never>) => Promise<Date>;
    readinessCheck: (variables: Record<string, never>) => Promise<Date>;
  };
  user: {
    getCurrent: () => Promise<{ email: string }>;
  };
  dataset: {
    getMany: (variables: { skip: number; take: number }) => Promise<Page>;
  };
  processor: {
    getMany: (variables: { skip: number; take: number }) => Promise<Page>;
  };
  processing: {
    getMany: (variables: { skip: number; take: number }) => Promise<Page>;
    getOne: (variables: { processingId: string }) => Promise<unknown>;
  };
};

const loadSdk = (): AutoDroidSdkCtor => {
  if (!existsSync(SDK_CJS_PATH)) {
    throw new Error(
      `autodroid-sdk dist missing at ${SDK_CJS_PATH}. Run yarn build in autodroid-sdk.`,
    );
  }

  return createRequire(import.meta.url)(SDK_CJS_PATH).AutoDroidSdk;
};

describe("External: autodroid SDK against a real backend and real Firebase", () => {
  let apiUrl: string;
  let email: string;
  let AutoDroidSdk: AutoDroidSdkCtor;

  beforeEach(async context => {
    AutoDroidSdk = loadSdk();
    initSecondaryProviders(context.container);
    initAndWaitRequisites({ selectedContainer: context.container });
    context.app = await getServer();

    await new Promise<void>(resolve => {
      context.app.httpServer.listen(0, "127.0.0.1", resolve);
    });

    const { port } = context.app.httpServer.address() as AddressInfo;
    apiUrl = `http://127.0.0.1:${port}/graphql`;
    ({ email } = getFirebaseTestCredentials("USER"));
  }, 60000);

  afterEach(async context => {
    await disposeServer(context.app);
  }, 60000);

  const authenticatedSdk = async () => {
    const session = await startAndGetSessionToken("USER");
    return new AutoDroidSdk({
      baseUrl: apiUrl,
      getAuthToken: async () => session.idToken,
    });
  };

  it("health-checks and reads the authenticated user plus paginated lists through the real SDK", async () => {
    const sdk = await authenticatedSdk();

    const health = await sdk.healthCheck.healthCheck({});
    const liveness = await sdk.healthCheck.livenessCheck({});
    const readiness = await sdk.healthCheck.readinessCheck({});
    const user = await sdk.user.getCurrent();
    const datasets = await sdk.dataset.getMany({ skip: 0, take: 5 });
    const processors = await sdk.processor.getMany({ skip: 0, take: 5 });
    const processes = await sdk.processing.getMany({ skip: 0, take: 5 });

    expect(health).toBeInstanceOf(Date);
    expect(liveness).toBeInstanceOf(Date);
    expect(readiness).toBeInstanceOf(Date);
    expect(user).toMatchObject({ email });
    expect(datasets.edges).toEqual(expect.any(Array));
    expect(datasets.totalCount).toEqual(expect.any(Number));
    expect(processors.edges).toEqual(expect.any(Array));
    expect(processors.totalCount).toEqual(expect.any(Number));
    expect(processes.edges).toEqual(expect.any(Array));
    expect(processes.totalCount).toEqual(expect.any(Number));
  }, 60000);

  it("surfaces a real API error for a missing processing instead of hallucinating success", async () => {
    const sdk = await authenticatedSdk();
    const missingId = "00000000-0000-4000-8000-000000000000";

    await expect(
      sdk.processing.getOne({ processingId: missingId }),
    ).rejects.toMatchObject({
      graphQLErrors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            code: "@processing_guard/PROCESSING_NOT_FOUND",
          }),
        }),
      ],
    });
  }, 60000);

  it("surfaces a validation error for a malformed processing id instead of a 500", async () => {
    const sdk = await authenticatedSdk();

    await expect(
      sdk.processing.getOne({ processingId: "does-not-exist" }),
    ).rejects.toMatchObject({
      graphQLErrors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            code: "BAD_USER_INPUT",
          }),
        }),
      ],
    });
  }, 60000);

  it("surfaces the real authentication failure instead of hallucinating success", async () => {
    let authErrors = 0;
    const sdk = new AutoDroidSdk({
      baseUrl: apiUrl,
      onAuthError: () => {
        authErrors += 1;
      },
    });

    await expect(sdk.user.getCurrent()).rejects.toMatchObject({
      graphQLErrors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            code: "UNAUTHORIZED",
          }),
        }),
      ],
    });
    expect(authErrors).toBe(1);
  }, 60000);
});
