// Util import
import { namedFieldResult } from "@modules/mcp/utils/mcpToolResult.util";

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
  MCP_REGISTRATION_TOKEN_SELECTION,
  MCP_WORKER_SELECTION,
  mcpConnectionSelection,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Schema import
import { pageInputPolicy } from "@modules/mcp/schemas/mcpToolInput.schema";

const REGISTRATION_TOKEN_WITH_VALUE_SELECTION = `${MCP_REGISTRATION_TOKEN_SELECTION} token`;

export const MCP_ADMIN_WORKER_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_admin_list_workers",
    description: `List every registered worker across all users. ${MCP_LIST_PAGE_DESCRIPTION} Requires admin access.`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}, $user_id: String, $registration_token_id: String, $missing: Boolean, $archived: Boolean) { adminWorkers(${MCP_PAGE_ARGUMENTS}, user_id: $user_id, registration_token_id: $registration_token_id, missing: $missing, archived: $archived) { ${mcpConnectionSelection(MCP_WORKER_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_admin_show_worker",
    description: "Show one registered worker. Requires admin access.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($worker_id: String!) { adminWorker(worker_id: $worker_id) { ${MCP_WORKER_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_update_worker",
    description:
      "Change a worker's description or tags. Requires admin access.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($worker_id: String!, $data: AdminWorkerUpdateSchema!) { adminWorkerUpdate(worker_id: $worker_id, data: $data) { ${MCP_WORKER_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_delete_worker",
    description: "Delete a worker. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($worker_id: String!) { adminWorkerDelete(worker_id: $worker_id) { ${MCP_WORKER_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_clean_missing_workers",
    description:
      "Remove every worker that stopped reporting. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation { adminWorkerCleanMissing }`,
    result: namedFieldResult("removed"),
  },
  {
    name: "autodroid_admin_list_worker_registration_tokens",
    description: `List the worker registration tokens, without their values. ${MCP_LIST_PAGE_DESCRIPTION} Requires admin access.`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query (${MCP_PAGE_VARIABLES}, $token: String, $is_unlimited_usage: Boolean, $user_id: String, $activated: Boolean, $activatable: Boolean, $expired: Boolean, $archived: Boolean) { adminWorkerRegistrationTokens(${MCP_PAGE_ARGUMENTS}, token: $token, is_unlimited_usage: $is_unlimited_usage, user_id: $user_id, activated: $activated, activatable: $activatable, expired: $expired, archived: $archived) { ${mcpConnectionSelection(MCP_REGISTRATION_TOKEN_SELECTION)} } }`,
    inputPolicy: pageInputPolicy,
  },
  {
    name: "autodroid_admin_show_worker_registration_token",
    description:
      "Show one worker registration token, including its value. Requires admin access.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query ($worker_registration_token_id: String!) { adminWorkerRegistrationToken(worker_registration_token_id: $worker_registration_token_id) { ${REGISTRATION_TOKEN_WITH_VALUE_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_create_worker_registration_token",
    description:
      "Create a worker registration token and show its value. Requires admin access.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($data: WorkerRegistrationTokenCreateSchema!) { adminWorkerRegistrationTokenCreate(data: $data) { ${REGISTRATION_TOKEN_WITH_VALUE_SELECTION} } }`,
  },
  {
    name: "autodroid_admin_delete_worker_registration_token",
    description:
      "Delete a worker registration token; its value is not shown. Requires admin access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($worker_registration_token_id: String!) { adminWorkerRegistrationTokenDelete(worker_registration_token_id: $worker_registration_token_id) { ${MCP_REGISTRATION_TOKEN_SELECTION} } }`,
  },
];
