// Util import
import { checkedAtResult } from "@modules/mcp/utils/mcpToolResult.util";

// Constant import
import { MCP_READ_TOOL_ANNOTATIONS } from "./mcp.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

export const MCP_HEALTH_TOOLS: IMcpToolDefinition[] = [
  {
    name: "autodroid_health_check",
    description: "Check that the AutoDroid API answers (returns its clock).",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query { healthCheck }`,
    result: checkedAtResult,
  },
  {
    name: "autodroid_health_liveness",
    description: "Check that the AutoDroid API process is alive.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query { healthLivenessCheck }`,
    result: checkedAtResult,
  },
  {
    name: "autodroid_health_readiness",
    description:
      "Check that the AutoDroid API and the services it depends on are ready.",
    annotations: MCP_READ_TOOL_ANNOTATIONS,
    document: `query { healthReadinessCheck }`,
    result: checkedAtResult,
  },
];
