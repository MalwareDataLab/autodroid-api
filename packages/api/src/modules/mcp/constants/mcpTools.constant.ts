// Constant import
import { MCP_ACCOUNT_TOOLS } from "./mcpAccountTools.constant";
import { MCP_ADMIN_DATASET_TOOLS } from "./mcpAdminDatasetTools.constant";
import { MCP_ADMIN_FILE_TOOLS } from "./mcpAdminFileTools.constant";
import { MCP_ADMIN_PROCESSING_TOOLS } from "./mcpAdminProcessingTools.constant";
import { MCP_ADMIN_PROCESSOR_TOOLS } from "./mcpAdminProcessorTools.constant";
import { MCP_ADMIN_WORKER_TOOLS } from "./mcpAdminWorkerTools.constant";
import { MCP_DATASET_TOOLS } from "./mcpDatasetTools.constant";
import { MCP_HEALTH_TOOLS } from "./mcpHealthTools.constant";
import { MCP_PROCESSING_TOOLS } from "./mcpProcessingTools.constant";
import { MCP_PROCESSOR_TOOLS } from "./mcpProcessorTools.constant";

export const MCP_USER_TOOLS = [
  ...MCP_ACCOUNT_TOOLS,
  ...MCP_DATASET_TOOLS,
  ...MCP_PROCESSOR_TOOLS,
  ...MCP_PROCESSING_TOOLS,
  ...MCP_HEALTH_TOOLS,
];

export const MCP_ADMIN_TOOLS = [
  ...MCP_ADMIN_DATASET_TOOLS,
  ...MCP_ADMIN_PROCESSOR_TOOLS,
  ...MCP_ADMIN_PROCESSING_TOOLS,
  ...MCP_ADMIN_WORKER_TOOLS,
  ...MCP_ADMIN_FILE_TOOLS,
];
