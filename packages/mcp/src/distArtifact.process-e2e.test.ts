import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// eslint-disable-next-line import/no-unresolved -- eslint-import-resolver-typescript doesn't follow the SDK's wildcard "./*" exports map; tsc and Node both resolve this correctly
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import/no-unresolved -- same wildcard-exports resolver limitation as above
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const DIST_BIN_PATH = join(__dirname, "..", "dist", "bin.js");

// Both packages' builds are made fresh once by the e2e project's
// globalSetup (test/config/e2e/globalSetup.ts) before any test file here
// runs — not per-file, so the filesystem has settled before the sibling
// mcp.process-e2e.test.ts's cold ts-node compile resolves "autodroid-cli".
describe("MCP built artifact (dist/bin.js under plain node — the real IDE launch path, zero ts-node)", () => {
  let client: Client;
  let isolatedHome: string;

  beforeEach(() => {
    isolatedHome = mkdtempSync(join(tmpdir(), "autodroid-mcp-dist-e2e-"));
    client = new Client({
      name: "autodroid-dist-e2e-client",
      version: "1.0.0",
    });
  });

  afterEach(async () => {
    await client.close();
    rmSync(isolatedHome, { recursive: true, force: true });
  });

  it("serves real tool calls when launched exactly as an IDE would launch it", async () => {
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: [DIST_BIN_PATH],
        env: {
          HOME: isolatedHome,
          PATH: process.env.PATH ?? "",
          AUTODROID_CLI_API_URL:
            "https://autodroid-mcp-dist-e2e.invalid/graphql",
          AUTODROID_CLI_FIREBASE_WEB_API_KEY: "test-key",
        },
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
});
