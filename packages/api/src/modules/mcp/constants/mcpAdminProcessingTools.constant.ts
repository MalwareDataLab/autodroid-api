// Util import
import {
  namedFieldResult,
  wholeListResult,
} from "@modules/mcp/utils/mcpToolResult.util";

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
  MCP_PROCESSING_SELECTION,
  MCP_PROCESSING_TIME_ESTIMATION_SELECTION,
  mcpConnectionSelection,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Schema import
import { pageInputPolicy } from "@modules/mcp/schemas/mcpToolInput.schema";

export const MCP_ADMIN_PROCESSING_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_admin_list_processing",
    description: `List every processing run across all users. ${MCP_LIST_PAGE_DESCRIPTION} Requires admin access.`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}, $processor_id: String, $dataset_id: String, $status: PROCESSING_STATUS, $visibility: PROCESSING_VISIBILITY, $started: Boolean, $finished: Boolean, $user_id: String, $worker_id: String, $result_file_id: String, $metrics_file_id: String, $keep_until_start_date: DateTimeISO, $keep_until_end_date: DateTimeISO, $created_at_start_date: DateTimeISO, $created_at_end_date: DateTimeISO, $include_archived: Boolean) { adminProcesses(${MCP_PAGE_ARGUMENTS}, processor_id: $processor_id, dataset_id: $dataset_id, status: $status, visibility: $visibility, started: $started, finished: $finished, user_id: $user_id, worker_id: $worker_id, result_file_id: $result_file_id, metrics_file_id: $metrics_file_id, keep_until_start_date: $keep_until_start_date, keep_until_end_date: $keep_until_end_date, created_at_start_date: $created_at_start_date, created_at_end_date: $created_at_end_date, include_archived: $include_archived) { ${mcpConnectionSelection(MCP_PROCESSING_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_admin_show_processing",
    description:
      "Show one processing run, owned by any user. Requires admin access.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($processing_id: String!) { adminProcessing(processing_id: $processing_id) { ${MCP_PROCESSING_DETAIL_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_update_processing",
    description:
      "Change any processing run's keep-until moment and, optionally, its visibility. Requires admin access.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($processing_id: String!, $data: AdminProcessingUpdateSchema!) { adminProcessingUpdate(processing_id: $processing_id, data: $data) { ${MCP_PROCESSING_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_delete_processing",
    description: "Delete any processing run. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($processing_id: String!) { adminProcessingDelete(processing_id: $processing_id) { ${MCP_PROCESSING_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_clean_expired_processing",
    description:
      "Permanently remove every expired processing run. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation { adminProcessingCleanExpired }`,
    result: namedFieldResult("removed"),
  },
  {
    name: "autodroid_admin_estimate_processing_time",
    description: `Estimate processing durations for a dataset and/or a processor (all combinations when omitted). ${MCP_LIST_PAGE_DESCRIPTION} Requires admin access.`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($dataset_id: String, $processor_id: String) { adminProcessingTimeEstimation(dataset_id: $dataset_id, processor_id: $processor_id) { ${MCP_PROCESSING_TIME_ESTIMATION_SELECTION} } }`,
    result: wholeListResult,
  },
  {
    name: "autodroid_admin_fail_dangling_processing",
    description:
      "Mark processing runs left dangling (not progressing) as failed. Without filters, fails the PENDING runs created more than one day ago. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($created_at_end_date: DateTimeISO, $status: PROCESSING_STATUS) { adminProcessingFailDangling(created_at_end_date: $created_at_end_date, status: $status) }`,
    result: namedFieldResult("failed"),
  },
];
