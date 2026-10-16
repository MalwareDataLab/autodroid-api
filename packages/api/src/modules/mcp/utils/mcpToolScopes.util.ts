// Constant import
import {
  MCP_ADMIN_TOOLS,
  MCP_USER_TOOLS,
} from "@modules/mcp/constants/mcpTools.constant";
import {
  MCP_SCOPE_ADMIN,
  MCP_SCOPE_READ,
  MCP_SCOPE_WRITE,
  MCP_SUPPORTED_SCOPES,
} from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

interface IMcpToolEntry {
  tool: IMcpToolDefinition;
  isAdminTool: boolean;
  requiredScopes: string[];
}

const toEntry = (
  tool: IMcpToolDefinition,
  isAdminTool: boolean,
): IMcpToolEntry => ({
  tool,
  isAdminTool,
  requiredScopes: [
    tool.annotations.readOnlyHint ? MCP_SCOPE_READ : MCP_SCOPE_WRITE,
    ...(isAdminTool ? [MCP_SCOPE_ADMIN] : []),
  ],
});

const MCP_TOOL_ENTRIES: IMcpToolEntry[] = [
  ...MCP_USER_TOOLS.map(tool => toEntry(tool, false)),
  ...MCP_ADMIN_TOOLS.map(tool => toEntry(tool, true)),
];

interface IMcpCaller {
  isAdmin: boolean;
}

const listMcpToolsFor = ({ isAdmin }: IMcpCaller): IMcpToolDefinition[] =>
  MCP_TOOL_ENTRIES.filter(entry => isAdmin || !entry.isAdminTool).map(
    ({ tool }) => tool,
  );

const findScopesToRequest = (
  toolName: string,
  { isAdmin, scopes }: IMcpCaller & { scopes: string[] },
): string[] => {
  const entry = MCP_TOOL_ENTRIES.find(({ tool }) => tool.name === toolName);
  if (!entry || (entry.isAdminTool && !isAdmin)) return [];
  if (entry.requiredScopes.every(scope => scopes.includes(scope))) return [];

  return MCP_SUPPORTED_SCOPES.filter(
    scope => scopes.includes(scope) || entry.requiredScopes.includes(scope),
  );
};

export { findScopesToRequest, listMcpToolsFor };
