// Util import
import { namedFieldResult } from "@modules/mcp/utils/mcpToolResult.util";

// Constant import
import { MCP_DESTRUCTIVE_TOOL_ANNOTATIONS } from "./mcp.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

export const MCP_ADMIN_FILE_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_admin_remove_dangling_files",
    description:
      "Permanently remove every stored file that no dataset or processing run uses. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation { adminFileRemoveAllDangling }`,
    result: namedFieldResult("removed"),
  },
];
