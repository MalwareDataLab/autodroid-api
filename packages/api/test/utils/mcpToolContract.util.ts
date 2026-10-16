import { readFileSync } from "node:fs";
import { join } from "node:path";

// Constant import
import { MCP_SERVER_NAME } from "@modules/mcp/constants/mcp.constant";

interface IMcpContractTool {
  name: string;
  field: string;
  description: string;
  access: "user" | "admin";
  effect: "read" | "write" | "destructive";
  output: string[];
  itemOutput?: string[];
}

const MCP_TOOL_CONTRACT: IMcpContractTool[] = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/mcpToolContract.json"), "utf8"),
);

const MCP_TOOL_NAME_PREFIX = `${MCP_SERVER_NAME}_`;

const mcpToolNamesOf = (access: IMcpContractTool["access"]) =>
  MCP_TOOL_CONTRACT.filter(tool => tool.access === access).map(
    tool => `${MCP_TOOL_NAME_PREFIX}${tool.name}`,
  );

export type { IMcpContractTool };
export { MCP_TOOL_CONTRACT, MCP_TOOL_NAME_PREFIX, mcpToolNamesOf };
