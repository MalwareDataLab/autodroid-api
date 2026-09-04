import { z } from "zod";
// eslint-disable-next-line import/no-unresolved -- eslint-import-resolver-typescript doesn't follow the SDK's wildcard "./*" exports map; tsc and Node both resolve this correctly
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// eslint-disable-next-line import/no-unresolved -- same wildcard-exports resolver limitation as above
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import PACKAGE_INFO from "@/package.json";

// Tool import
import { buildTools } from "./tools";

const SERVER_NAME = "autodroid";
const SERVER_VERSION = PACKAGE_INFO.version;

const createMcpServer = (): McpServer => {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  buildTools().forEach(tool => {
    server.registerTool<z.ZodRawShape, z.ZodRawShape>(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (input: Record<string, any>) => {
        try {
          const result = await tool.handle(input || {});
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      },
    );
  });

  return server;
};

const startMcpServer = async (): Promise<void> => {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
};

export { createMcpServer, startMcpServer };
