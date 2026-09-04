import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

// Real, built dist artifact — the exact file a real IDE/user's shell would
// run, not the TypeScript source under ts-node. Proves the same class of
// dist-artifact bug already found and fixed for this package this session
// (package.json main/types pointing at raw src instead of dist).
const execFileAsync = promisify(execFile);
const BIN_PATH = join(__dirname, "..", "dist", "bin.js");

const paginationConnection = (nodes: Record<string, unknown>[]) => ({
  edges: nodes.map(node => ({ node })),
});

const GRAPHQL_HANDLERS: Record<
  string,
  (variables?: Record<string, unknown>) => Record<string, unknown>
> = {
  "query User": () => ({
    user: { id: "user-1", name: "Ada Lovelace", email: "ada@example.test" },
  }),
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
  "query UserProcessing": (variables: Record<string, unknown> = {}) => {
    if (variables.processing_id === "does-not-exist") {
      throw Object.assign(new Error("GraphQL error"), {
        graphqlErrors: [{ message: "Processing not found." }],
      });
    }
    return { userProcessing: { id: "processing-1", status: "SUCCEEDED" } };
  },
  "query UserProcessingTimeEstimation": () => ({
    userProcessingTimeEstimation: {
      estimated_execution_time: 120,
      estimated_total_time: 180,
      estimated_waiting_time: 60,
    },
  }),
  "query UserProcessingEstimatedFinish": () => ({
    userProcessingEstimatedFinish: {
      estimated_start_time: "2099-01-01T00:00:00.000Z",
      estimated_finish_time: "2099-01-01T02:00:00.000Z",
    },
  }),
  "mutation UserUpdateData": () => ({
    userUpdateData: { id: "user-1", name: "Ada L." },
  }),
  "mutation UserRequestDatasetProcessing": () => ({
    userRequestDatasetProcessing: { id: "processing-2", status: "PENDING" },
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
        const operation = query.match(/(?:query|mutation)\s+(\w+)/);
        const key = operation
          ? `${query.trim().startsWith("mutation") ? "mutation" : "query"} ${operation[1]}`
          : undefined;
        const handler = key ? GRAPHQL_HANDLERS[key] : undefined;

        res.writeHead(200, { "Content-Type": "application/json" });
        if (!handler) {
          res.end(
            JSON.stringify({
              errors: [{ message: `Unexpected operation for query: ${query}` }],
            }),
          );
          return;
        }
        try {
          res.end(JSON.stringify({ data: handler(parsed.variables) }));
        } catch (error: any) {
          res.end(
            JSON.stringify({
              errors: error.graphqlErrors ?? [{ message: error.message }],
            }),
          );
        }
      });
    });
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${port}/graphql` });
    });
  });

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

describe("CLI dist artifact (real built bin.js, real spawned process, real HTTP)", () => {
  let server: http.Server;
  let apiUrl: string;
  let isolatedHome: string;

  beforeAll(async () => {
    ({ server, url: apiUrl } = await startGraphqlStub());
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    rmSync(isolatedHome, { recursive: true, force: true });
  });

  const runCli = (args: string[], authenticated = true) => {
    isolatedHome = mkdtempSync(join(tmpdir(), "autodroid-cli-e2e-"));
    if (authenticated) buildFixtureSession(isolatedHome);

    return execFileAsync("node", [BIN_PATH, ...args], {
      env: {
        ...process.env,
        HOME: isolatedHome,
        AUTODROID_CLI_API_URL: apiUrl,
        AUTODROID_CLI_FIREBASE_WEB_API_KEY: "test-key",
      },
    });
  };

  it("whoami: prints the real authenticated user via --json", async () => {
    const { stdout } = await runCli(["whoami", "--json"]);
    expect(JSON.parse(stdout)).toEqual({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.test",
    });
  });

  it("datasets: lists real datasets as a human-readable table", async () => {
    const { stdout } = await runCli(["datasets"]);
    expect(stdout).toContain("dataset-1");
    expect(stdout).toContain("Drebin Android Malware Dataset");
  });

  it("processors: lists real processors", async () => {
    const { stdout } = await runCli(["processors", "--json"]);
    expect(JSON.parse(stdout)).toEqual([
      { id: "processor-1", name: "DroidAugmentor", version: "0.0.1" },
    ]);
  });

  it("processes: lists real processing runs", async () => {
    const { stdout } = await runCli(["processes", "--json"]);
    expect(JSON.parse(stdout)).toEqual([
      { id: "processing-1", status: "SUCCEEDED" },
    ]);
  });

  it("processing show <id>: shows one real processing run via the default positional alias", async () => {
    const { stdout } = await runCli(["processing", "processing-1", "--json"]);
    expect(JSON.parse(stdout)).toEqual({
      id: "processing-1",
      status: "SUCCEEDED",
    });
  });

  it("processing estimate: estimates real processing time", async () => {
    const { stdout } = await runCli([
      "processing",
      "estimate",
      "--dataset-id",
      "dataset-1",
      "--processor-id",
      "processor-1",
      "--json",
    ]);
    expect(JSON.parse(stdout)).toEqual({
      estimated_execution_time: 120,
      estimated_total_time: 180,
      estimated_waiting_time: 60,
    });
  });

  it("processing finish-estimate <id>: estimates a real finish time", async () => {
    const { stdout } = await runCli([
      "processing",
      "finish-estimate",
      "processing-1",
      "--json",
    ]);
    expect(JSON.parse(stdout)).toEqual({
      estimated_start_time: "2099-01-01T00:00:00.000Z",
      estimated_finish_time: "2099-01-01T02:00:00.000Z",
    });
  });

  it("processing run: starts a real processing run with repeatable --param", async () => {
    const { stdout } = await runCli([
      "processing",
      "run",
      "--dataset-id",
      "dataset-1",
      "--processor-id",
      "processor-1",
      "--param",
      "epochs=10",
      "--json",
    ]);
    expect(JSON.parse(stdout)).toEqual({
      id: "processing-2",
      status: "PENDING",
    });
  });

  it("profile update: updates the real profile", async () => {
    const { stdout } = await runCli([
      "profile",
      "update",
      "--name",
      "Ada L.",
      "--json",
    ]);
    expect(JSON.parse(stdout)).toEqual({ id: "user-1", name: "Ada L." });
  });

  it("rejects an invalid --param without an '=' with a clean error, no stack trace", async () => {
    await expect(
      runCli([
        "processing",
        "run",
        "--dataset-id",
        "dataset-1",
        "--processor-id",
        "processor-1",
        "--param",
        "epochs",
      ]),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(
        'Invalid --param "epochs", expected name=value.',
      ),
    });
  });

  it("surfaces the real not-authenticated error, not a protocol crash", async () => {
    await expect(runCli(["whoami"], false)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Not authenticated"),
    });
  });

  it("surfaces a real GraphQL error cleanly, no raw stack trace in output", async () => {
    await expect(
      runCli(["processing", "does-not-exist", "--json"]),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.not.stringContaining(" at "),
    });
  });
});
