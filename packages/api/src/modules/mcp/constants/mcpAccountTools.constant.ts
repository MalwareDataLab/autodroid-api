// Util import
import { wholeListResult } from "@modules/mcp/utils/mcpToolResult.util";

// Constant import
import {
  MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
  MCP_LIST_PAGE_DESCRIPTION,
  MCP_READ_TOOL_ANNOTATIONS,
  MCP_WRITE_TOOL_ANNOTATIONS,
} from "./mcp.constant";
import {
  MCP_AUTHORIZATION_GRANT_SELECTION,
  MCP_USER_SELECTION,
} from "./mcpGraphQLSelection.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

export const MCP_ACCOUNT_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_whoami",
    description: "Show the authenticated user.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query { user { ${MCP_USER_SELECTION} } }`,
  },
  {
    name: "autodroid_show_session",
    description: "Show how long the current session stays valid.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query { session { user { ${MCP_USER_SELECTION} } user_auth_provider_conn { id } user_session { access_token_expires_at refresh_token_expires_at } } }`,
    result: ({ session }) => ({
      user: session.user,
      user_auth_provider_conn_id: session.user_auth_provider_conn.id,
      access_token_expires_at: session.user_session.access_token_expires_at,
      refresh_token_expires_at: session.user_session.refresh_token_expires_at,
    }),
  },
  {
    name: "autodroid_close_sessions",
    description:
      "Sign this account out everywhere: every session of the account is closed and must log in again, and every app or agent connected over MCP loses access.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation { userSessionsClose { id } }`,
    result: () => ({ closed: true }),
  },
  {
    name: "autodroid_update_profile",
    description: "Update your profile.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($data: UserUpdateDataSchema!) { userUpdateData(data: $data) { ${MCP_USER_SELECTION} } }`,
  },
  {
    name: "autodroid_update_profile_learning_data",
    description: "Replace your learning-progress data.",
    annotations: MCP_WRITE_TOOL_ANNOTATIONS,
    document: `mutation ($data: JSON!) { userUpdateLearningData(data: $data) { ${MCP_USER_SELECTION} } }`,
  },
  {
    name: "autodroid_list_mcp_connections",
    description: `List the apps and agents you authorized to use your account over MCP. ${MCP_LIST_PAGE_DESCRIPTION}`,
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query { userMcpAuthorizationGrants { ${MCP_AUTHORIZATION_GRANT_SELECTION} } }`,
    result: wholeListResult,
  },
  {
    name: "autodroid_revoke_mcp_connection",
    description:
      "Revoke an app or agent connection; it loses access to your account at once.",
    annotations: MCP_DESTRUCTIVE_TOOL_ANNOTATIONS,
    document: `mutation ($mcp_authorization_grant_id: String!) { userMcpAuthorizationGrantRevoke(mcp_authorization_grant_id: $mcp_authorization_grant_id) { ${MCP_AUTHORIZATION_GRANT_SELECTION} } }`,
  },
];
