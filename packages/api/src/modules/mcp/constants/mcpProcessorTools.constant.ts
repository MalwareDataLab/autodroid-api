// Constant import
import {
  MCP_LIST_PAGE_DESCRIPTION,
  MCP_READ_TOOL_ANNOTATIONS,
} from "./mcp.constant";
import {
  MCP_PAGE_ARGUMENTS,
  MCP_PAGE_VARIABLES,
  MCP_PROCESSOR_SELECTION,
  mcpConnectionSelection,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Schema import
import { pageInputPolicy } from "@modules/mcp/schemas/mcpToolInput.schema";

export const MCP_PROCESSOR_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_list_processors",
    description: `List the data synthesis processors you can use: every PUBLIC one plus the HIDDEN ones you created. ${MCP_LIST_PAGE_DESCRIPTION}`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}) { userProcessors(${MCP_PAGE_ARGUMENTS}) { ${mcpConnectionSelection(MCP_PROCESSOR_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_show_processor",
    description:
      "Show one processor, any PUBLIC one or one you created, and its parameters.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($processor_id: String!) { userProcessor(processor_id: $processor_id) { ${MCP_PROCESSOR_SELECTION} } }`,
  },
];
