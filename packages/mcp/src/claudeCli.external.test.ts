import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// execFileSync would block this process's event loop for the whole `claude`
// run — but the GraphQL stub server below needs that same event loop free to
// answer the spawned MCP server's request. Must stay async.
const execFileAsync = promisify(execFile);

const DIST_BIN_PATH = join(__dirname, "..", "dist", "bin.js");

const isClaudeCliAvailable = (): boolean => {
  try {
    execFileSync("claude", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const buildFixtureSession = (homeDir: string) => {
  const futureExpirySeconds = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(
    JSON.stringify({ exp: futureExpirySeconds }),
  ).toString("base64url");
  const sessionDir = join(homeDir, ".autodroid");
  mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
  writeFileSync(
    join(sessionDir, "session.json"),
    JSON.stringify({
      idToken: `header.${payload}.signature`,
      refreshToken: "fixture-refresh-token",
      expiresAt: futureExpirySeconds * 1000,
    }),
    { mode: 0o600 },
  );
};

const FIXTURE_USER = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.test",
  is_admin: false,
  language: "en-us",
};

const paginationConnection = (nodes: Record<string, unknown>[]) => ({
  edges: nodes.map(node => ({ node })),
});

const GRAPHQL_HANDLERS: Record<string, () => Record<string, unknown>> = {
  "query User": () => ({ user: FIXTURE_USER }),
  "query UserDatasets": () => ({
    userDatasets: paginationConnection([
      { id: "dataset-1", description: "Drebin Android Malware Dataset" },
    ]),
  }),
  "query UserProcessors": () => ({
    userProcessors: paginationConnection([
      { id: "processor-1", name: "DroidAugmentor", version: "0.0.1" },
    ]),
  }),
  "query UserProcesses": () => ({
    userProcesses: paginationConnection([
      { id: "processing-1", status: "SUCCEEDED" },
    ]),
  }),
  "query UserProcessing": () => ({
    userProcessing: {
      id: "processing-1",
      status: "SUCCEEDED",
      dataset: {
        id: "dataset-1",
        description: "Drebin Android Malware Dataset",
      },
      processor: { id: "processor-1", name: "DroidAugmentor" },
    },
  }),
  "query UserProcessingTimeEstimation": () => ({
    userProcessingTimeEstimation: {
      dataset_id: "dataset-1",
      processor_id: "processor-1",
      estimated_execution_time: 120,
      estimated_total_time: 180,
      estimated_waiting_time: 60,
    },
  }),
  "query UserProcessingEstimatedFinish": () => ({
    userProcessingEstimatedFinish: {
      processing_id: "processing-1",
      dataset_id: "dataset-1",
      processor_id: "processor-1",
      estimated_start_time: "2099-01-01T00:00:00.000Z",
      estimated_finish_time: "2099-01-01T02:00:00.000Z",
    },
  }),
};

const startGraphqlStub = () =>
  new Promise<{ server: http.Server; url: string }>(resolve => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
      });
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}");
        const query = typeof parsed.query === "string" ? parsed.query : "";
        // "query User" is a substring of "query UserProcessors" etc. — a
        // naive .includes() match always picks the first (wrong) handler.
        // Extract the real operation name and look it up exactly.
        const operationName = query.match(/query\s+(\w+)/)?.[1];
        const handler = operationName
          ? GRAPHQL_HANDLERS[`query ${operationName}`]
          : undefined;

        if (handler) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: handler() }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            errors: [{ message: `Unexpected operation for query: ${query}` }],
          }),
        );
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}/graphql` });
    });
  });

const claudeCliAvailable = isClaudeCliAvailable();

if (process.env.CI && !claudeCliAvailable) {
  throw new Error(
    "claude CLI is required in CI for packages/mcp test:external.",
  );
}

describe.skipIf(!claudeCliAvailable)(
  "External: a real Claude model (Haiku) drives the MCP server via the real `claude` CLI",
  () => {
    let stubServer: http.Server;
    let stubUrl: string;
    let isolatedHome: string;
    let mcpConfigPath: string;
    let unauthenticatedHome: string;
    let unauthenticatedMcpConfigPath: string;

    const buildMcpConfig = (homeDir: string, url: string) => ({
      mcpServers: {
        autodroid: {
          command: "node",
          args: [DIST_BIN_PATH],
          env: {
            HOME: homeDir,
            AUTODROID_CLI_API_URL: url,
            AUTODROID_CLI_FIREBASE_WEB_API_KEY: "fixture-firebase-key",
          },
        },
      },
    });

    const askClaude = (prompt: string, configPath: string) =>
      execFileAsync(
        "claude",
        [
          "-p",
          prompt,
          "--mcp-config",
          configPath,
          "--strict-mcp-config",
          "--model",
          "haiku",
          "--permission-mode",
          "bypassPermissions",
          "--output-format",
          "json",
        ],
        { encoding: "utf-8" },
      ).then(({ stdout }) => (JSON.parse(stdout) as { result: string }).result);

    beforeAll(async () => {
      ({ server: stubServer, url: stubUrl } = await startGraphqlStub());

      isolatedHome = mkdtempSync(join(tmpdir(), "autodroid-mcp-claude-cli-"));
      buildFixtureSession(isolatedHome);
      mcpConfigPath = join(isolatedHome, "mcp-config.json");
      writeFileSync(
        mcpConfigPath,
        JSON.stringify(buildMcpConfig(isolatedHome, stubUrl)),
      );

      // No session.json here — resolveIdToken() throws "Not authenticated.",
      // proving the real auth guard, not just the happy path.
      unauthenticatedHome = mkdtempSync(
        join(tmpdir(), "autodroid-mcp-claude-cli-unauth-"),
      );
      unauthenticatedMcpConfigPath = join(
        unauthenticatedHome,
        "mcp-config.json",
      );
      writeFileSync(
        unauthenticatedMcpConfigPath,
        JSON.stringify(buildMcpConfig(unauthenticatedHome, stubUrl)),
      );
    });

    afterAll(() => {
      stubServer.close();
      rmSync(isolatedHome, { recursive: true, force: true });
      rmSync(unauthenticatedHome, { recursive: true, force: true });
    });

    it("correctly selects and invokes autodroid_whoami, and reports the real returned data", async () => {
      const result = await askClaude(
        "Call the autodroid_whoami MCP tool now with empty arguments. Report exactly what it returns.",
        mcpConfigPath,
      );

      expect(result).toContain("Ada Lovelace");
      expect(result).toContain("ada@example.test");
    }, 90000);

    it("correctly selects and invokes autodroid_list_datasets", async () => {
      const result = await askClaude(
        "Call the autodroid_list_datasets MCP tool now with empty arguments. Report exactly what it returns.",
        mcpConfigPath,
      );

      expect(result).toContain("dataset-1");
      expect(result).toContain("Drebin Android Malware Dataset");
    }, 90000);

    it("correctly selects and invokes autodroid_list_processors", async () => {
      const result = await askClaude(
        "Call the autodroid_list_processors MCP tool now with empty arguments. Report exactly what it returns.",
        mcpConfigPath,
      );

      expect(result).toContain("processor-1");
      expect(result).toContain("DroidAugmentor");
    }, 90000);

    it("correctly selects and invokes autodroid_list_processes", async () => {
      const result = await askClaude(
        "Call the autodroid_list_processes MCP tool now with empty arguments. Report exactly what it returns.",
        mcpConfigPath,
      );

      expect(result).toContain("processing-1");
      expect(result).toContain("SUCCEEDED");
    }, 90000);

    it("correctly selects and invokes autodroid_show_processing with the required processingId argument", async () => {
      const result = await askClaude(
        'Call the autodroid_show_processing MCP tool now with processingId set to "processing-1". Report exactly what it returns.',
        mcpConfigPath,
      );

      expect(result).toContain("processing-1");
      expect(result).toContain("DroidAugmentor");
      expect(result).toContain("Drebin Android Malware Dataset");
    }, 90000);

    it("correctly selects and invokes autodroid_estimate_processing_time", async () => {
      const result = await askClaude(
        'Call the autodroid_estimate_processing_time MCP tool now with datasetId "dataset-1" and processorId "processor-1". Report exactly what it returns.',
        mcpConfigPath,
      );

      expect(result).toContain("180");
    }, 90000);

    it("correctly selects and invokes autodroid_estimate_processing_finish", async () => {
      const result = await askClaude(
        'Call the autodroid_estimate_processing_finish MCP tool now with processingId "processing-1". Report exactly what it returns.',
        mcpConfigPath,
      );

      expect(result).toContain("2099-01-01T02:00:00");
    }, 90000);

    it("surfaces the real authentication failure instead of hallucinating success", async () => {
      const result = await askClaude(
        "Call the autodroid_whoami MCP tool now with empty arguments. Report exactly what it returns, including any error.",
        unauthenticatedMcpConfigPath,
      );

      expect(result).toContain("Not authenticated");
      expect(result).not.toContain("Ada Lovelace");
    }, 90000);
  },
);
