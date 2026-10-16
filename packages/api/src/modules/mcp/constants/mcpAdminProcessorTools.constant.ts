// Constant import
import {
  MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
  MCP_LIST_PAGE_DESCRIPTION,
  MCP_READ_TOOL_ANNOTATIONS,
  MCP_WRITE_TOOL_ANNOTATIONS,
} from "./mcp.constant";
import {
  MCP_ADMIN_PROCESSOR_SELECTION,
  MCP_PAGE_ARGUMENTS,
  MCP_PAGE_VARIABLES,
  mcpConnectionSelection,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Schema import
import { pageInputPolicy } from "@modules/mcp/schemas/mcpToolInput.schema";

export const MCP_ADMIN_PROCESSOR_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_admin_list_processors",
    description: `List every processor, including non-public ones. ${MCP_LIST_PAGE_DESCRIPTION} Requires admin access.`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}) { adminProcessors(${MCP_PAGE_ARGUMENTS}) { ${mcpConnectionSelection(MCP_ADMIN_PROCESSOR_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_admin_show_processor",
    description:
      "Show one processor with its whole definition, including non-public ones. Requires admin access.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($processor_id: String!) { adminProcessor(processor_id: $processor_id) { ${MCP_ADMIN_PROCESSOR_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_create_processor",
    description: "Create a processor. Requires admin access.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($data: ProcessorSchema!) { adminProcessorCreate(data: $data) { ${MCP_ADMIN_PROCESSOR_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_update_processor",
    description:
      "Replace a processor's whole definition with the given one. Requires admin access.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($processor_id: String!, $data: ProcessorSchema!) { adminProcessorUpdate(processor_id: $processor_id, data: $data) { ${MCP_ADMIN_PROCESSOR_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_delete_processor",
    description: "Delete a processor. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($processor_id: String!) { adminProcessorDelete(processor_id: $processor_id) { ${MCP_ADMIN_PROCESSOR_SELECTION} } }`,
  },
];
