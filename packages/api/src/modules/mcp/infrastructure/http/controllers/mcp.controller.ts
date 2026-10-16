import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Request, Response } from "express";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Util import
import { createMcpGraphQLExecutor } from "@modules/mcp/utils/createMcpGraphQLExecutor.util";
import { createMcpServer } from "@modules/mcp/utils/createMcpServer.util";
import { findScopesToRequest } from "@modules/mcp/utils/mcpToolScopes.util";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

class McpController {
  constructor(
    private executeOperation: ReturnType<typeof createMcpGraphQLExecutor>,
  ) {}

  public async handle(req: Request, res: Response): Promise<void> {
    if (Array.isArray(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Batch requests are not supported." },
      });
      return;
    }

    const { auth } = req as Request & { auth?: AuthInfo };
    const session = auth!.extra!.session as Session;
    const { scopes } = auth!;

    const scopesToRequest = this.scopesToRequestFor(req, session, scopes);
    if (scopesToRequest.length) {
      res
        .status(403)
        .set(
          "WWW-Authenticate",
          `Bearer error="insufficient_scope", scope="${scopesToRequest.join(" ")}", resource_metadata="${getMcpConfig().protectedResourceMetadataUrl}"`,
        )
        .json({
          error: "insufficient_scope",
          error_description: "Insufficient scope",
        });
      return;
    }

    const server = createMcpServer({
      session,
      executeOperation: operation =>
        this.executeOperation({ ...operation, session, req, res }),
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  private scopesToRequestFor(
    req: Request,
    session: Session,
    scopes: string[],
  ): string[] {
    const { method, params } = req.body ?? {};
    if (method !== "tools/call" || typeof params?.name !== "string") return [];

    return findScopesToRequest(params.name, {
      isAdmin: session.is_admin,
      scopes,
    });
  }

  public methodNotAllowed(_req: Request, res: Response): Response {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
}

export { McpController };
