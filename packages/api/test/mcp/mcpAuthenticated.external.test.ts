import { execFile, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Container import
import {
  initAndWaitRequisites,
  initSecondaryProviders,
} from "@shared/container";

// Util import
import { getFirebaseTestCredentials } from "@/test/utils/getFirebaseTestCredentials.util";
import { disposeServer, getServer } from "@/test/utils/getServer.util";
import { mcpToolNamesOf } from "@/test/utils/mcpToolContract.util";

const execFileAsync = promisify(execFile);

const AUTODROID_SDK_PATH =
  process.env.AUTODROID_SDK_PATH ||
  join(__dirname, "..", "..", "..", "..", "..", "autodroid-sdk");
const CLI_BIN_PATH = join(AUTODROID_SDK_PATH, "dist", "cli", "bin.cjs");
const cliBinAvailable = existsSync(CLI_BIN_PATH);

if (process.env.CI && !cliBinAvailable) {
  throw new Error(
    `autodroid CLI build not found at ${CLI_BIN_PATH} (sibling autodroid-sdk checkout not present/built). Add a checkout+build step for autodroid-sdk alongside this repo, or set AUTODROID_SDK_PATH.`,
  );
}

const REGISTERED_TOOLS = mcpToolNamesOf("user");

const parseToolText = (
  result: Record<string, unknown>,
): { isError: boolean; text: string; json?: unknown } => {
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

describe.skipIf(!cliBinAvailable)(
  "External: MCP and CLI authenticated against a real backend and real Firebase",
  () => {
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
      await execFileAsync("node", [CLI_BIN_PATH, "login", "--email", email], {
        env: {
          ...process.env,
          AUTODROID_CLI_API_URL: apiUrl,
          AUTODROID_CLI_FIREBASE_WEB_API_KEY: apiKey,
          AUTODROID_CLI_PASSWORD: password,
        },
      });
    };

    const connectMcp = async () => {
      const client = new Client({
        name: "autodroid-external-client",
        version: "1.0.0",
      });
      await client.connect(
        new StdioClientTransport({
          command: "node",
          args: [CLI_BIN_PATH, "mcp"],
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
          ...process.env,
          HOME: isolatedHome,
          AUTODROID_CLI_API_URL: apiUrl,
          AUTODROID_CLI_FIREBASE_WEB_API_KEY: apiKey,
        },
      });

    const getRealIdToken = async (): Promise<string> => {
      const tokenHome = mkdtempSync(join(tmpdir(), "autodroid-token-fetch-"));
      try {
        await execFileAsync("node", [CLI_BIN_PATH, "login", "--email", email], {
          env: {
            ...process.env,
            HOME: tokenHome,
            AUTODROID_CLI_API_URL: apiUrl,
            AUTODROID_CLI_FIREBASE_WEB_API_KEY: apiKey,
            AUTODROID_CLI_PASSWORD: password,
          },
        });
        const session = JSON.parse(
          readFileSync(join(tokenHome, ".autodroid", "session.json"), "utf8"),
        );
        return session.idToken;
      } finally {
        rmSync(tokenHome, { recursive: true, force: true });
      }
    };

    const spawnCliLoginAndCaptureUserCode = (
      env: NodeJS.ProcessEnv,
    ): {
      userCode: Promise<string>;
      exit: Promise<{ stdout: string; code: number | null }>;
    } => {
      const child = spawn("node", [CLI_BIN_PATH, "login"], { env });

      let stderrBuffer = "";
      let stdoutBuffer = "";

      const userCode = new Promise<string>((resolve, reject) => {
        child.stderr.on("data", chunk => {
          stderrBuffer += chunk.toString();
          const match = stderrBuffer.match(
            /Confirm this code on the sign-in page: (\S+)/,
          );
          if (match) resolve(match[1]);
        });
        child.on("error", reject);
      });

      child.stdout.on("data", chunk => {
        stdoutBuffer += chunk.toString();
      });

      const exit = new Promise<{ stdout: string; code: number | null }>(
        resolve => {
          child.on("close", code => resolve({ stdout: stdoutBuffer, code }));
        },
      );

      return { userCode, exit };
    };

    it("lists the real registered tools and answers whoami with the real authenticated user", async () => {
      await authenticate();
      const client = await connectMcp();

      try {
        const { tools } = await client.listTools();
        expect(tools.map(tool => tool.name).sort()).toEqual(
          [...REGISTERED_TOOLS].sort(),
        );

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
            arguments: { take: 10 },
          }),
        );
        const processors = parseToolText(
          await client.callTool({
            name: "autodroid_list_processors",
            arguments: { take: 10 },
          }),
        );
        const processes = parseToolText(
          await client.callTool({
            name: "autodroid_list_processing",
            arguments: { take: 10 },
          }),
        );

        expect(datasets.isError).toBeFalsy();
        expect(processors.isError).toBeFalsy();
        expect(processes.isError).toBeFalsy();
        [datasets, processors, processes].forEach(list =>
          expect(list.json).toEqual({
            items: expect.any(Array),
            total_count: expect.any(Number),
            has_next_page: expect.any(Boolean),
          }),
        );
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
            arguments: { processing_id: "does-not-exist" },
          }),
        );
        const estimatedTime = parseToolText(
          await client.callTool({
            name: "autodroid_estimate_processing_time",
            arguments: {
              dataset_id: "does-not-exist",
              processor_id: "does-not-exist",
            },
          }),
        );
        const estimatedFinish = parseToolText(
          await client.callTool({
            name: "autodroid_estimate_processing_finish",
            arguments: { processing_id: "does-not-exist" },
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

    it("surfaces the real browser-login retry's own failure instead of hallucinating success", async () => {
      const client = await connectMcp();

      try {
        const result = parseToolText(
          await client.callTool({
            name: "autodroid_whoami",
            arguments: {},
          }),
        );
        expect(result.isError).toBe(true);
        expect(result.text).toContain("AUTODROID_CLI_WEB_URL");
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

    it("completes a real device-code browser login round trip: real user code, real Redis-backed challenge, real Firebase custom-token mint and exchange", async () => {
      const idToken = await getRealIdToken();
      const restBaseUrl = apiUrl.replace(/\/graphql\/?$/, "");

      const { userCode, exit } = spawnCliLoginAndCaptureUserCode({
        ...process.env,
        HOME: isolatedHome,
        PATH: process.env.PATH ?? "",
        AUTODROID_CLI_API_URL: apiUrl,
        AUTODROID_CLI_FIREBASE_WEB_API_KEY: apiKey,
        AUTODROID_CLI_WEB_URL: "http://127.0.0.1:1",
      });

      const code = await userCode;

      const authorizeResponse = await fetch(
        `${restBaseUrl}/cli-auth/authorize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ user_code: code }),
        },
      );
      expect(authorizeResponse.ok).toBe(true);

      const { stdout, code: exitCode } = await exit;
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Logged in.");

      const { stdout: whoamiStdout } = await runCli(["whoami", "--json"]);
      expect(JSON.parse(whoamiStdout)).toMatchObject({ email });
    }, 60000);
  },
);
