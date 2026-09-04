import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { bootstrapImportMock, dotenvConfigMock } = vi.hoisted(() => ({
  bootstrapImportMock: vi.fn(),
  dotenvConfigMock: vi.fn(),
}));

vi.mock("dotenv", () => ({ default: { config: dotenvConfigMock } }));

const originalArgv = process.argv;
const originalEnv = { ...process.env };

const runCli = async (args: string[]) => {
  process.argv = ["/usr/bin/node", "/app/index.js", ...args];
  vi.resetModules();
  vi.doMock("./bootstrap", () => {
    bootstrapImportMock({
      APP_ENV: process.env.APP_ENV,
      APP_PORT: process.env.APP_PORT,
      HANDOVER_KEY: process.env.HANDOVER_KEY,
    });
    return { Bootstrap: Promise.resolve() };
  });
  await import("./index");
  await new Promise(resolve => {
    setImmediate(resolve);
  });
};

describe("App: cli entrypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.argv = originalArgv;
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  it("should default the app environment to development and leave the port untouched", async () => {
    delete (process.env as Record<string, unknown>).APP_PORT;

    await runCli([]);

    expect(process.env.APP_ENV).toBe("development");
    expect(process.env.APP_PORT).toBeUndefined();
  });

  it("should override the app port when --port is provided", async () => {
    await runCli(["--port", "4001"]);

    expect(process.env.APP_PORT).toBe("4001");
  });

  it("should override the app port through the -p alias", async () => {
    await runCli(["-p", "4002"]);

    expect(process.env.APP_PORT).toBe("4002");
  });

  it("should set the app environment from --env", async () => {
    await runCli(["--env", "production"]);

    expect(process.env.APP_ENV).toBe("production");
  });

  it("should apply every well formed --set pair to the process environment", async () => {
    await runCli(["--set", "FIRST_KEY=first", "--set", "SECOND_KEY=second"]);

    expect(process.env.FIRST_KEY).toBe("first");
    expect(process.env.SECOND_KEY).toBe("second");
  });

  it("should ignore malformed --set entries while keeping the valid ones", async () => {
    delete process.env.NO_SEPARATOR;
    delete process.env.EMPTY_VALUE;

    await runCli([
      "--set",
      "NO_SEPARATOR",
      "--set",
      "=orphan_value",
      "--set",
      "EMPTY_VALUE=",
      "--set",
      "VALID_KEY=valid",
    ]);

    expect(process.env.NO_SEPARATOR).toBeUndefined();
    expect(process.env.EMPTY_VALUE).toBeUndefined();
    expect(process.env.VALID_KEY).toBe("valid");
  });

  it("should load the test env file when NODE_ENV is test", async () => {
    process.env.NODE_ENV = "test";

    await runCli([]);

    expect(dotenvConfigMock).toHaveBeenCalledWith({ path: ".env.test" });
  });

  it("should load the default env file outside the test environment", async () => {
    process.env.NODE_ENV = "production";

    await runCli([]);

    expect(dotenvConfigMock).toHaveBeenCalledWith({ path: ".env" });
  });

  it("should hand over to the bootstrap module after the environment is prepared", async () => {
    await runCli(["--port", "4003", "--set", "HANDOVER_KEY=handover"]);

    await vi.waitFor(() => {
      expect(bootstrapImportMock).toHaveBeenCalledOnce();
    });
    expect(bootstrapImportMock).toHaveBeenCalledWith({
      APP_ENV: "development",
      APP_PORT: "4003",
      HANDOVER_KEY: "handover",
    });
  });
});
