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
  MCP_FILE_UPLOAD_SELECTION,
  MCP_PAGE_ARGUMENTS,
  MCP_PAGE_VARIABLES,
  mcpConnectionSelection,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Schema import
import { pageInputPolicy } from "@modules/mcp/schemas/mcpToolInput.schema";

export const MCP_DATASET_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_list_datasets",
    description: `List the datasets you can use: your PRIVATE datasets plus every PUBLIC one (user_id is each owner's id); your datasets under review are not listed. ${MCP_LIST_PAGE_DESCRIPTION}`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}) { userDatasets(${MCP_PAGE_ARGUMENTS}) { ${mcpConnectionSelection(MCP_DATASET_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_show_dataset",
    description:
      "Show one dataset, yours or any PUBLIC one, with a download link to its file.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($dataset_id: String!) { userDataset(dataset_id: $dataset_id) { ${MCP_DATASET_SELECTION} file { ${MCP_FILE_DOWNLOAD_SELECTION} } } }`,
  },
  {
    name: "autodroid_create_dataset",
    description:
      "Register a new dataset from its file's metadata. Returns the dataset and a short-lived signed URL: upload the file bytes to it with an HTTP PUT whose Content-Type is the MIME type mime_type names, before it expires.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($data: UserDatasetCreateSchema!) { userDatasetCreate(data: $data) { ${MCP_DATASET_SELECTION} file { ${MCP_FILE_UPLOAD_SELECTION} } } }`,
  },
  {
    name: "autodroid_update_dataset",
    description:
      "Change one of your datasets' description and tags. Replaces both: an omitted one is cleared.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($dataset_id: String!, $data: UserDatasetUpdateSchema!) { userDatasetUpdate(dataset_id: $dataset_id, data: $data) { ${MCP_DATASET_SELECTION} } }`,
  },
  {
    name: "autodroid_delete_dataset",
    description: "Delete one of your datasets.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($dataset_id: String!) { userDatasetDelete(dataset_id: $dataset_id) { ${MCP_DATASET_SELECTION} } }`,
  },
  {
    name: "autodroid_publish_dataset",
    description: "Ask for one of your datasets to be reviewed for publication.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($dataset_id: String!) { userDatasetRequestPublication(dataset_id: $dataset_id) { ${MCP_DATASET_SELECTION} } }`,
  },
];
