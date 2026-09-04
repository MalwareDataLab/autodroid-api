import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// eslint-disable-next-line import/no-unresolved -- eslint-import-resolver-typescript doesn't follow the SDK's wildcard "./*" exports map; tsc and Node both resolve this correctly
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import/no-unresolved -- same wildcard-exports resolver limitation as above
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const RUN_ARGS = [
  "-r",
  "ts-node/register",
  "-r",
  "tsconfig-paths/register",
  "src/bin.ts",
];

describe("MCP server (real process, real stdio protocol, zero mocking)", () => {
  let client: Client;
  let isolatedHome: string;

  beforeEach(() => {
    isolatedHome = mkdtempSync(join(tmpdir(), "autodroid-mcp-e2e-"));
    client = new Client({ name: "autodroid-e2e-client", version: "1.0.0" });
  });

  afterEach(async () => {
    await client.close();
    rmSync(isolatedHome, { recursive: true, force: true });
  });

  it("lists the real registered tools over a real stdio handshake", async () => {
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: RUN_ARGS,
        env: { HOME: isolatedHome, PATH: process.env.PATH ?? "" },
      }),
    );

    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name).sort()).toEqual([
      "autodroid_estimate_processing_finish",
      "autodroid_estimate_processing_time",
      "autodroid_list_datasets",
      "autodroid_list_processes",
      "autodroid_list_processors",
      "autodroid_show_processing",
      "autodroid_whoami",
    ]);
    expect(
      tools.find(tool => tool.name === "autodroid_show_processing")?.inputSchema
        .required,
    ).toEqual(["processingId"]);
  });

  it("surfaces the real not-authenticated error as a tool error, not a protocol crash", async () => {
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: RUN_ARGS,
        env: {
          HOME: isolatedHome,
          PATH: process.env.PATH ?? "",
          AUTODROID_CLI_API_URL: "https://autodroid-mcp-e2e.invalid/graphql",
          AUTODROID_CLI_FIREBASE_WEB_API_KEY: "test-key",
        },
      }),
    );

    const result = await client.callTool({
      name: "autodroid_whoami",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Not authenticated. Run `autodroid login` first.",
      },
    ]);
  });

  it("rejects a tool call for an unregistered tool name", async () => {
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: RUN_ARGS,
        env: { HOME: isolatedHome, PATH: process.env.PATH ?? "" },
      }),
    );

    const result = await client.callTool({
      name: "autodroid_delete_everything",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain(
      "autodroid_delete_everything",
    );
  });

  it("rejects a required argument missing from the input schema", async () => {
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: RUN_ARGS,
        env: { HOME: isolatedHome, PATH: process.env.PATH ?? "" },
      }),
    );

    const result = await client.callTool({
      name: "autodroid_show_processing",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain(
      "processingId",
    );
  });
});
