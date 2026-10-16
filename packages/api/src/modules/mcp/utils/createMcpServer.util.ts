import util from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as Sentry from "@sentry/node";
import { z } from "zod";

// Configuration import
import { getEnvConfig } from "@config/env";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { buildMcpToolInputShape } from "@modules/mcp/utils/mcpToolInputShape.util";
import { defaultResult } from "@modules/mcp/utils/mcpToolResult.util";
import { listMcpToolsFor } from "@modules/mcp/utils/mcpToolScopes.util";
import { logger } from "@shared/utils/logger";

// Constant import
import { MCP_SERVER_NAME } from "@modules/mcp/constants/mcp.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";
import { Session } from "@modules/user/types/IUserSession.dto";

interface ICreateMcpServer {
  session: Session;
  executeOperation: (operation: {
    document: string;
    variables: Record<string, unknown>;
  }) => Promise<Record<string, any>>;
}

const inputSchemas = new Map<string, z.ZodObject>();

const inputSchemaOf = (tool: IMcpToolDefinition): z.ZodObject => {
  if (!inputSchemas.has(tool.name))
    inputSchemas.set(tool.name, z.strictObject(buildMcpToolInputShape(tool)));
  return inputSchemas.get(tool.name)!;
};

const deriveEveryMcpToolInput = (): void =>
  listMcpToolsFor({ isAdmin: true }).forEach(inputSchemaOf);

const toToolTitle = (name: string): string => {
  const words = name.replace(`${MCP_SERVER_NAME}_`, "").replaceAll("_", " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

const createMcpServer = ({
  session,
  executeOperation,
}: ICreateMcpServer): McpServer => {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: getEnvConfig().APP_INFO.version,
  });

  const tools = listMcpToolsFor({ isAdmin: session.is_admin });

  tools.forEach(tool => {
    server.registerTool(
      tool.name,
      {
        title: toToolTitle(tool.name),
        description: tool.description,
        inputSchema: inputSchemaOf(tool),
        annotations: tool.annotations,
      },
      async (input: Record<string, any>) => {
        try {
          const data = await executeOperation({
            document: tool.document,
            variables: input,
          });
          const result = (tool.result ?? defaultResult)(data) as Record<
            string,
            unknown
          >;

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error: unknown) {
          if (error instanceof AppError)
            return {
              isError: true,
              content: [{ type: "text" as const, text: error.message }],
            };

          logger.error(
            `❌ Application failure: `,
            util.inspect(error, false, null, true),
          );
          Sentry.captureException(error);

          return {
            isError: true,
            content: [
              { type: "text" as const, text: "Internal server error." },
            ],
          };
        }
      },
    );
  });

  return server;
};

export { createMcpServer, deriveEveryMcpToolInput };
