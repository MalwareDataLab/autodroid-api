import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ startMcpServer: vi.fn() }));

vi.mock("./server", () => ({ startMcpServer: h.startMcpServer }));

describe("MCP: bin", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  it("should start the server over stdio", async () => {
    h.startMcpServer.mockResolvedValue(undefined);

    await import("./bin");

    await vi.waitFor(() => expect(h.startMcpServer).toHaveBeenCalledOnce());
    expect(process.exitCode).toBeUndefined();
  });

  it("should report a startup failure and exit non zero", async () => {
    h.startMcpServer.mockRejectedValue(new Error("stdio unavailable"));

    await import("./bin");

    await vi.waitFor(() => expect(process.exitCode).toBe(1));
    expect(console.error).toHaveBeenCalledWith("stdio unavailable");
    process.exitCode = undefined;
  });
});
