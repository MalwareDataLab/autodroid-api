import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { McpController } from "./mcp.controller";

const mocks = vi.hoisted(() => ({
  createMcpServer: vi.fn(),
  StreamableHTTPServerTransport: vi.fn(),
  transportClose: vi.fn(),
  transportHandleRequest: vi.fn(),
  serverConnect: vi.fn(),
  serverClose: vi.fn(),
  executeOperation: vi.fn(),
  findScopesToRequest: vi.fn(),
}));

vi.mock("@config/mcp", () => ({
  getMcpConfig: () => ({
    protectedResourceMetadataUrl:
      "https://api.autodroid.example/.well-known/oauth-protected-resource/mcp",
  }),
}));

vi.mock("@modules/mcp/utils/mcpToolScopes.util", () => ({
  findScopesToRequest: mocks.findScopesToRequest,
}));

vi.mock("@modules/mcp/utils/createMcpServer.util", () => ({
  createMcpServer: mocks.createMcpServer,
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: mocks.StreamableHTTPServerTransport,
}));

describe("Controller: McpController", () => {
  let controller: McpController;
  let req: Partial<Request>;
  let res: Partial<Response> & { on: ReturnType<typeof vi.fn> };
  let closeHandlers: (() => void)[];

  beforeEach(() => {
    vi.clearAllMocks();
    closeHandlers = [];

    mocks.createMcpServer.mockReturnValue({
      connect: mocks.serverConnect,
      close: mocks.serverClose,
    });
    mocks.StreamableHTTPServerTransport.mockImplementation(() => ({
      close: mocks.transportClose,
      handleRequest: mocks.transportHandleRequest,
    }));

    req = {
      language: "en",
      body: { jsonrpc: "2.0" },
      auth: {
        scopes: ["autodroid:read"],
        extra: { session: { user: { id: "user-1" }, is_admin: false } },
      },
    } as any;

    res = {
      on: vi.fn((event: string, handler: () => void) => {
        if (event === "close") closeHandlers.push(handler);
      }),
      setHeader: vi.fn(),
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    mocks.findScopesToRequest.mockReturnValue([]);

    controller = new McpController(mocks.executeOperation);
  });

  describe("handle", () => {
    it("should build the server from the verified session and connect it to a stateless JSON transport", async () => {
      await controller.handle(req as Request, res as unknown as Response);

      expect(mocks.createMcpServer).toHaveBeenCalledWith({
        session: { user: { id: "user-1" }, is_admin: false },
        executeOperation: expect.any(Function),
      });
      expect(mocks.StreamableHTTPServerTransport).toHaveBeenCalledWith({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      expect(mocks.serverConnect).toHaveBeenCalled();
      expect(mocks.transportHandleRequest).toHaveBeenCalledWith(
        req,
        res,
        req.body,
      );
    });

    it("should refuse a batch of messages, which would count as one request against the rate limit", async () => {
      req.body = [
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
      ];

      await controller.handle(req as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Batch requests are not supported." },
      });
      expect(mocks.createMcpServer).not.toHaveBeenCalled();
      expect(mocks.transportHandleRequest).not.toHaveBeenCalled();
    });

    it("should answer a call to a tool the token lacks scopes for with a 403 that names the scopes to ask for", async () => {
      mocks.findScopesToRequest.mockReturnValue([
        "autodroid:read",
        "autodroid:write",
      ]);
      req.body = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "autodroid_update_profile", arguments: {} },
      };

      await controller.handle(req as Request, res as unknown as Response);

      expect(mocks.findScopesToRequest).toHaveBeenCalledExactlyOnceWith(
        "autodroid_update_profile",
        { isAdmin: false, scopes: ["autodroid:read"] },
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.set).toHaveBeenCalledWith(
        "WWW-Authenticate",
        'Bearer error="insufficient_scope", scope="autodroid:read autodroid:write", resource_metadata="https://api.autodroid.example/.well-known/oauth-protected-resource/mcp"',
      );
      expect(res.json).toHaveBeenCalledWith({
        error: "insufficient_scope",
        error_description: "Insufficient scope",
      });
      expect(mocks.createMcpServer).not.toHaveBeenCalled();
    });

    it.each([
      ["a tools/list call", { method: "tools/list" }],
      ["a call without a tool name", { method: "tools/call", params: {} }],
      ["a body that is not an object", undefined],
    ])("should not look for missing scopes on %s", async (_label, body) => {
      req.body = body;

      await controller.handle(req as Request, res as unknown as Response);

      expect(mocks.findScopesToRequest).not.toHaveBeenCalled();
      expect(mocks.createMcpServer).toHaveBeenCalled();
    });

    it("should run a tool's operation as the verified session, with the request it came in on", async () => {
      mocks.executeOperation.mockResolvedValue({ user: { id: "user-1" } });
      await controller.handle(req as Request, res as unknown as Response);
      const { executeOperation } = mocks.createMcpServer.mock.calls[0][0];

      const data = await executeOperation({
        document: "query { user { id } }",
        variables: { take: 5 },
      });

      expect(data).toEqual({ user: { id: "user-1" } });
      expect(mocks.executeOperation).toHaveBeenCalledExactlyOnceWith({
        document: "query { user { id } }",
        variables: { take: 5 },
        session: { user: { id: "user-1" }, is_admin: false },
        req,
        res,
      });
    });

    it("should close the transport and server when the response closes", async () => {
      await controller.handle(req as Request, res as unknown as Response);

      expect(closeHandlers).toHaveLength(1);
      closeHandlers[0]();

      expect(mocks.transportClose).toHaveBeenCalled();
      expect(mocks.serverClose).toHaveBeenCalled();
    });
  });

  describe("methodNotAllowed", () => {
    it("should respond 405 with an Allow: POST header", () => {
      const result = controller.methodNotAllowed(
        req as Request,
        res as unknown as Response,
      );

      expect(res.setHeader).toHaveBeenCalledWith("Allow", "POST");
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: "method_not_allowed" });
      expect(result).toBe(res);
    });
  });
});
