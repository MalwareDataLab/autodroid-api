import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export interface IMcpToolDefinition {
  name: string;
  description: string;
  annotations: ToolAnnotations;
  document: string;
  inputPolicy?: z.ZodRawShape;
  result?: (data: Record<string, any>) => unknown;
}
