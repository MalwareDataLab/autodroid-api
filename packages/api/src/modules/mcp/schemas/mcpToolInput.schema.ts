import { z } from "zod";

// Constant import
import {
  MCP_TAKE_DEFAULT,
  MCP_TAKE_LIMIT,
} from "@modules/mcp/constants/mcp.constant";

const pageInputPolicy = {
  take: z
    .number()
    .int()
    .positive()
    .max(MCP_TAKE_LIMIT)
    .optional()
    .describe(
      `How many items to return (default ${MCP_TAKE_DEFAULT}, at most ${MCP_TAKE_LIMIT}).`,
    ),
};

export { pageInputPolicy };
