import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ runCli: vi.fn() }));

vi.mock("./index", () => ({ runCli: h.runCli }));

describe("CLI: bin", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it("should run the parsed arguments and forward the exit code", async () => {
    h.runCli.mockResolvedValue(1);
    vi.stubGlobal("process", { ...process, argv: ["node", "bin", "whoami"] });

    await import("./bin");
    await vi.waitFor(() => expect(h.runCli).toHaveBeenCalledWith(["whoami"]));

    vi.unstubAllGlobals();
  });
});
