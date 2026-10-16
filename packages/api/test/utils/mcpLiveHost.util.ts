import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "vitest";

// Util import
import { completeAuthorization } from "./mcpOAuthFlow.util";

const LIVE_HOST_MAX_BUDGET_USD = "0.5";
const LIVE_HOST_TIMEOUT_MS = 180_000;
const HOST_KILL_MARGIN_MS = 10_000;
const MCP_SERVER_LABEL = "autodroid";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run the live host test.`);
  return value;
};

interface IStreamEvent {
  type: string;
  result?: string;
  subtype?: string;
  tools?: string[];
  mcp_servers?: { name: string; status: string }[];
  message?: {
    content?: {
      type: string;
      id?: string;
      name?: string;
      tool_use_id?: string;
      is_error?: boolean;
      input?: unknown;
      content?: string | { type: string; text?: string }[];
    }[];
  };
}

const hostToolName = (name: string) => `mcp__${MCP_SERVER_LABEL}__${name}`;

const textOf = (content: string | { text?: string }[] | undefined): string =>
  typeof content === "string"
    ? content
    : (content ?? []).map(part => part.text ?? "").join("");

const runLiveHost = (
  url: string,
  accessToken: string,
  prompt: string,
): Promise<IStreamEvent[]> => {
  const command = requireEnv("MCP_LIVE_HOST_COMMAND");
  const model = requireEnv("MCP_LIVE_HOST_MODEL");
  const workDirectory = mkdtempSync(join(tmpdir(), "autodroid-live-host-"));
  const configPath = join(workDirectory, "mcp.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      mcpServers: {
        [MCP_SERVER_LABEL]: {
          type: "http",
          url,
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      },
    }),
  );

  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      [
        "-p",
        prompt,
        "--model",
        model,
        "--mcp-config",
        configPath,
        "--strict-mcp-config",
        "--allowedTools",
        `mcp__${MCP_SERVER_LABEL}`,
        "--output-format",
        "stream-json",
        "--verbose",
        "--no-session-persistence",
        "--max-budget-usd",
        LIVE_HOST_MAX_BUDGET_USD,
      ],
      {
        cwd: workDirectory,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: LIVE_HOST_TIMEOUT_MS - HOST_KILL_MARGIN_MS,
      },
    );

    let output = "";
    let errors = "";
    child.stdout.on("data", chunk => {
      output += chunk;
    });
    child.stderr.on("data", chunk => {
      errors += chunk;
    });
    child.on("error", reject);
    child.on("close", code => {
      rmSync(workDirectory, { recursive: true, force: true });
      if (code !== 0)
        reject(new Error(`the host exited with ${code}: ${errors || output}`));
      else
        resolve(
          output
            .split("\n")
            .filter(Boolean)
            .map(line => JSON.parse(line) as IStreamEvent),
        );
    });
  });
};

const toolCallsOf = (events: IStreamEvent[]) => {
  const parts = events.flatMap(event => event.message?.content ?? []);
  return parts
    .filter(part => part.type === "tool_use")
    .map(use => {
      const result = parts.find(
        part => part.type === "tool_result" && part.tool_use_id === use.id,
      );
      return {
        name: use.name as string,
        input: use.input,
        answered: result !== undefined,
        isError: Boolean(result?.is_error),
        text: textOf(result?.content),
      };
    });
};

const hostAnswerOf = (events: IStreamEvent[]): string =>
  events.find(event => event.type === "result")?.result ?? "";

const startLiveServer = async (
  context: TestContext,
  authorize: TestContext["userAuthorized"],
  scope: string,
) => {
  await new Promise<void>(resolve => {
    context.app.httpServer.listen(0, "127.0.0.1", resolve);
  });
  const { port } = context.app.httpServer.address() as AddressInfo;
  const { access_token } = await completeAuthorization(
    context,
    authorize,
    scope,
  );

  return { url: `http://127.0.0.1:${port}/mcp`, access_token };
};

export {
  LIVE_HOST_TIMEOUT_MS,
  MCP_SERVER_LABEL,
  hostAnswerOf,
  hostToolName,
  runLiveHost,
  startLiveServer,
  toolCallsOf,
};
