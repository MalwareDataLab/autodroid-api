// Constant import
import {
  MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
  MCP_LIST_PAGE_DESCRIPTION,
  MCP_READ_TOOL_ANNOTATIONS,
  MCP_WRITE_TOOL_ANNOTATIONS,
} from "./mcp.constant";
import {
  MCP_DATASET_SELECTION,
  MCP_FILE_DOWNLOAD_SELECTION,
  MCP_PAGE_ARGUMENTS,
  MCP_PAGE_VARIABLES,
  mcpConnectionSelection,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Schema import
import { pageInputPolicy } from "@modules/mcp/schemas/mcpToolInput.schema";

export const MCP_ADMIN_DATASET_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_admin_list_datasets",
    description: `List every dataset across all users. ${MCP_LIST_PAGE_DESCRIPTION} Requires admin access.`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}, $user_id: String, $file_id: String, $visibility: DATASET_VISIBILITY) { adminDatasets(${MCP_PAGE_ARGUMENTS}, user_id: $user_id, file_id: $file_id, visibility: $visibility) { ${mcpConnectionSelection(MCP_DATASET_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_admin_show_dataset",
    description: "Show one dataset, owned by any user. Requires admin access.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($dataset_id: String!) { adminDataset(dataset_id: $dataset_id) { ${MCP_DATASET_SELECTION} file { ${MCP_FILE_DOWNLOAD_SELECTION} } } }`,
  },
  {
    name: "autodroid_admin_update_dataset",
    description:
      "Change any dataset's description and tags. Replaces both: an omitted one is cleared. Requires admin access.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($dataset_id: String!, $data: AdminDatasetUpdateSchema!) { adminDatasetUpdate(dataset_id: $dataset_id, data: $data) { ${MCP_DATASET_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_set_dataset_visibility",
    description: "Change any dataset's visibility. Requires admin access.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($dataset_id: String!, $data: AdminDatasetUpdateVisibilitySchema!) { adminDatasetUpdateVisibility(dataset_id: $dataset_id, data: $data) { ${MCP_DATASET_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_delete_dataset",
    description: "Delete any dataset. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($dataset_id: String!) { adminDatasetDelete(dataset_id: $dataset_id) { ${MCP_DATASET_SELECTION} } }`,
  },
];
