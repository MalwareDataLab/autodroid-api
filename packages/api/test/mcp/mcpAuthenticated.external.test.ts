import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AddressInfo } from "node:net";

// eslint-disable-next-line import/no-unresolved -- eslint-import-resolver-typescript doesn't follow the SDK's wildcard "./*" exports map; tsc and Node both resolve this correctly
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import/no-unresolved -- same wildcard-exports resolver limitation as above
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// CLI import — real Firebase sign-in, persisted to an isolated HOME so the
// spawned MCP/CLI process (its own real process) picks it up.
import { login } from "autodroid-cli";

// Server util import
import { disposeServer, getServer } from "@/test/utils/getServer.util";
import { getFirebaseTestCredentials } from "@/test/utils/getFirebaseTestCredentials.util";

// Container import
import {
  initAndWaitRequisites,
  initSecondaryProviders,
} from "@shared/container";

const execFileAsync = promisify(execFile);

const MCP_BIN_PATH = join(
  dirname(require.resolve("autodroid-mcp/package.json")),
  "dist/bin.js",
);

const CLI_BIN_PATH = join(
  dirname(require.resolve("autodroid-cli/package.json")),
  "dist/bin.js",
);

const REGISTERED_TOOLS = [
  "autodroid_estimate_processing_finish",
  "autodroid_estimate_processing_time",
  "autodroid_list_datasets",
  "autodroid_list_processes",
  "autodroid_list_processors",
  "autodroid_show_processing",
  "autodroid_whoami",
];

const parseToolText = (result: {
  content: unknown;
}): { isError: boolean; text: string; json?: unknown } => {
  const [{ text }] = result.content as Array<{ text: string }>;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return {
    isError: Boolean((result as { isError?: boolean }).isError),
    text,
    json,
  };
};

describe("External: MCP and CLI authenticated against a real backend and real Firebase", () => {
  let isolatedHome: string;
  let originalHome: string | undefined;
  let apiUrl: string;
  let apiKey: string;
  let email: string;
  let password: string;

  beforeEach(async context => {
    initSecondaryProviders(context.container);
    initAndWaitRequisites({ selectedContainer: context.container });
    context.app = await getServer();

    await new Promise<void>(resolve => {
      context.app.httpServer.listen(0, "127.0.0.1", resolve);
    });

    const { port } = context.app.httpServer.address() as AddressInfo;
    apiUrl = `http://127.0.0.1:${port}/graphql`;
    isolatedHome = mkdtempSync(join(tmpdir(), "autodroid-mcp-external-"));
    originalHome = process.env.HOME;
    ({ email, password } = getFirebaseTestCredentials("USER"));
    apiKey = process.env.TESTING_FIREBASE_WEB_API_KEY!;
  }, 60000);

  afterEach(async context => {
    await disposeServer(context.app);
    rmSync(isolatedHome, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  }, 60000);

  const authenticate = async () => {
    process.env.HOME = isolatedHome;
    process.env.AUTODROID_CLI_API_URL = apiUrl;
    process.env.AUTODROID_CLI_FIREBASE_WEB_API_KEY = apiKey;
    try {
      await login({ email, password });
    } finally {
      delete process.env.AUTODROID_CLI_API_URL;
      delete process.env.AUTODROID_CLI_FIREBASE_WEB_API_KEY;
    }
  };

  const connectMcp = async () => {
    const client = new Client({
      name: "autodroid-external-client",
      version: "1.0.0",
    });
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: [MCP_BIN_PATH],
        env: {
          HOME: isolatedHome,
          PATH: process.env.PATH ?? "",
          AUTODROID_CLI_API_URL: apiUrl,
          AUTODROID_CLI_FIREBASE_WEB_API_KEY: apiKey,
        },
      }),
    );
    return client;
  };

  const runCli = (args: string[]) =>
    execFileAsync("node", [CLI_BIN_PATH, ...args], {
      env: {
        HOME: isolatedHome,
        PATH: process.env.PATH ?? "",
        AUTODROID_CLI_API_URL: apiUrl,
        AUTODROID_CLI_FIREBASE_WEB_API_KEY: apiKey,
      },
    });

  it("lists the real registered tools and answers whoami with the real authenticated user", async () => {
    await authenticate();
    const client = await connectMcp();

    try {
      const { tools } = await client.listTools();
      expect(tools.map(tool => tool.name).sort()).toEqual(REGISTERED_TOOLS);

      const result = await client.callTool({
        name: "autodroid_whoami",
        arguments: {},
      });
      const parsed = parseToolText(result);
      expect(parsed.isError).toBeFalsy();
      expect(parsed.json).toMatchObject({ email });
    } finally {
      await client.close();
    }
  }, 60000);

  it("lists datasets, processors and processes against the live API", async () => {
    await authenticate();
    const client = await connectMcp();

    try {
      const datasets = parseToolText(
        await client.callTool({
          name: "autodroid_list_datasets",
          arguments: { first: 10 },
        }),
      );
      const processors = parseToolText(
        await client.callTool({
          name: "autodroid_list_processors",
          arguments: { first: 10 },
        }),
      );
      const processes = parseToolText(
        await client.callTool({
          name: "autodroid_list_processes",
          arguments: { first: 10 },
        }),
      );

      expect(datasets.isError).toBeFalsy();
      expect(processors.isError).toBeFalsy();
      expect(processes.isError).toBeFalsy();
      expect(datasets.json).toEqual(expect.any(Array));
      expect(processors.json).toEqual(expect.any(Array));
      expect(processes.json).toEqual(expect.any(Array));
    } finally {
      await client.close();
    }
  }, 60000);

  it("surfaces a real API error for a missing processing instead of hallucinating success", async () => {
    await authenticate();
    const client = await connectMcp();

    try {
      const shown = parseToolText(
        await client.callTool({
          name: "autodroid_show_processing",
          arguments: { processingId: "does-not-exist" },
        }),
      );
      const estimatedTime = parseToolText(
        await client.callTool({
          name: "autodroid_estimate_processing_time",
          arguments: {
            datasetId: "does-not-exist",
            processorId: "does-not-exist",
          },
        }),
      );
      const estimatedFinish = parseToolText(
        await client.callTool({
          name: "autodroid_estimate_processing_finish",
          arguments: { processingId: "does-not-exist" },
        }),
      );

      expect(shown.isError).toBe(true);
      expect(estimatedTime.isError).toBe(true);
      expect(estimatedFinish.isError).toBe(true);
      expect(shown.text.length).toBeGreaterThan(0);
      expect(estimatedTime.text.length).toBeGreaterThan(0);
      expect(estimatedFinish.text.length).toBeGreaterThan(0);
    } finally {
      await client.close();
    }
  }, 60000);

  it("surfaces the real authentication failure instead of hallucinating success", async () => {
    const client = await connectMcp();

    try {
      const result = parseToolText(
        await client.callTool({
          name: "autodroid_whoami",
          arguments: {},
        }),
      );
      expect(result.isError).toBe(true);
      expect(result.text).toContain("Not authenticated");
    } finally {
      await client.close();
    }
  }, 60000);

  it("CLI dist artifact whoami hits the live API with the real Firebase session", async () => {
    await authenticate();
    const { stdout } = await runCli(["whoami", "--json"]);
    expect(JSON.parse(stdout)).toMatchObject({ email });
  }, 60000);

  it("CLI dist artifact surfaces not-authenticated against the live API", async () => {
    await expect(runCli(["whoami", "--json"])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Not authenticated"),
    });
  }, 60000);
});
