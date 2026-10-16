// Constant import
import {
  MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
  MCP_LIST_PAGE_DESCRIPTION,
  MCP_READ_TOOL_ANNOTATIONS,
  MCP_WRITE_TOOL_ANNOTATIONS,
} from "./mcp.constant";
import {
  MCP_PAGE_ARGUMENTS,
  MCP_PAGE_VARIABLES,
  MCP_PROCESSING_DETAIL_SELECTION,
  MCP_PROCESSING_FINISH_ESTIMATION_SELECTION,
  MCP_PROCESSING_SELECTION,
  MCP_PROCESSING_TIME_ESTIMATION_SELECTION,
  mcpConnectionSelection,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Schema import
import { pageInputPolicy } from "@modules/mcp/schemas/mcpToolInput.schema";

export const MCP_PROCESSING_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_list_processing",
    description: `List the processing runs you can see: your own and every PUBLIC one (user_id is each owner's id). ${MCP_LIST_PAGE_DESCRIPTION}`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}, $processor_id: String, $dataset_id: String, $status: PROCESSING_STATUS, $visibility: PROCESSING_VISIBILITY, $started: Boolean, $finished: Boolean) { userProcesses(${MCP_PAGE_ARGUMENTS}, processor_id: $processor_id, dataset_id: $dataset_id, status: $status, visibility: $visibility, started: $started, finished: $finished) { ${mcpConnectionSelection(MCP_PROCESSING_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_show_processing",
    description:
      "Show one processing run, yours or any PUBLIC one, including its status, its dataset and processor, and the download links of its result and metrics files.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($processing_id: String!) { userProcessing(processing_id: $processing_id) { ${MCP_PROCESSING_DETAIL_SELECTION} } }`,
  },
  {
    name: "autodroid_run_processing",
    description: "Start a processing run of a dataset with a processor.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($data: RequestDatasetProcessingSchema!) { userRequestDatasetProcessing(data: $data) { ${MCP_PROCESSING_SELECTION} } }`,
  },
  {
    name: "autodroid_delete_processing",
    description: "Delete one of your processing runs.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($processing_id: String!) { userProcessingDelete(processing_id: $processing_id) { ${MCP_PROCESSING_SELECTION} } }`,
  },
  {
    name: "autodroid_extend_processing",
    description: "Keep the files of a processing run until a later date.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($processing_id: String!, $keep_until: DateTimeISO!) { userProcessingExtendKeepUntil(processing_id: $processing_id, keep_until: $keep_until) { ${MCP_PROCESSING_SELECTION} } }`,
  },
  {
    name: "autodroid_set_processing_visibility",
    description: "Make a processing run private or public.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($processing_id: String!, $visibility: PROCESSING_VISIBILITY!) { userProcessingUpdateVisibility(processing_id: $processing_id, visibility: $visibility) { ${MCP_PROCESSING_SELECTION} } }`,
  },
  {
    name: "autodroid_estimate_processing_time",
    description:
      "Estimate a processing run's duration before starting it, given a dataset and a processor.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($dataset_id: String!, $processor_id: String!) { userProcessingTimeEstimation(dataset_id: $dataset_id, processor_id: $processor_id) { ${MCP_PROCESSING_TIME_ESTIMATION_SELECTION} } }`,
  },
  {
    name: "autodroid_estimate_processing_finish",
    description: "Estimate when an in-progress processing run will finish.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($processing_id: String!) { userProcessingEstimatedFinish(processing_id: $processing_id) { ${MCP_PROCESSING_FINISH_ESTIMATION_SELECTION} } }`,
  },
];
