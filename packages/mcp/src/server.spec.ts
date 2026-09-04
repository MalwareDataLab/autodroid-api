import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { createMcpServer, startMcpServer } from "./server";

const h = vi.hoisted(() => ({
  registerTool: vi.fn(),
  connect: vi.fn(),
  McpServer: vi.fn(),
  StdioServerTransport: vi.fn(),
  whoami: vi.fn(),
  listDatasets: vi.fn(),
  listProcessors: vi.fn(),
  listProcesses: vi.fn(),
  showProcessing: vi.fn(),
  estimateProcessingTime: vi.fn(),
  estimateProcessingFinish: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: h.McpServer.mockImplementation(() => ({
    registerTool: h.registerTool,
    connect: h.connect,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: h.StdioServerTransport,
}));

vi.mock("autodroid-cli", () => h);

describe("MCP: server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.McpServer.mockImplementation(() => ({
      registerTool: h.registerTool,
      connect: h.connect,
    }));
  });

  it("should register every tool on the server", () => {
    createMcpServer();

    expect(h.registerTool).toHaveBeenCalledTimes(7);
    expect(h.registerTool).toHaveBeenCalledWith(
      "autodroid_whoami",
      expect.objectContaining({ description: expect.any(String) }),
      expect.any(Function),
    );
  });

  it("should identify itself to the client", () => {
    createMcpServer();

    expect(h.McpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "autodroid",
        version: expect.any(String),
      }),
    );
  });

  it("should answer a tool call with the serialised result", async () => {
    h.whoami.mockResolvedValue({ id: "user-1" });

    createMcpServer();

    const [, , handler] = h.registerTool.mock.calls.find(
      call => call[0] === "autodroid_whoami",
    )!;

    await expect(handler({})).resolves.toEqual({
      content: [
        { type: "text", text: JSON.stringify({ id: "user-1" }, null, 2) },
      ],
    });
  });

  it("should tolerate a tool call arriving without input", async () => {
    h.whoami.mockResolvedValue({ id: "user-1" });

    createMcpServer();

    const [, , handler] = h.registerTool.mock.calls.find(
      call => call[0] === "autodroid_whoami",
    )!;

    await expect(handler(undefined)).resolves.toEqual({
      content: [
        { type: "text", text: JSON.stringify({ id: "user-1" }, null, 2) },
      ],
    });
  });

  it("should report a failing tool call as an error result", async () => {
    h.whoami.mockRejectedValue(new Error("Not authenticated."));

    createMcpServer();

    const [, , handler] = h.registerTool.mock.calls.find(
      call => call[0] === "autodroid_whoami",
    )!;

    await expect(handler({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "Not authenticated." }],
    });
  });

  it("should serve over stdio", async () => {
    await startMcpServer();

    expect(h.StdioServerTransport).toHaveBeenCalledOnce();
    expect(h.connect).toHaveBeenCalledOnce();
  });
});
