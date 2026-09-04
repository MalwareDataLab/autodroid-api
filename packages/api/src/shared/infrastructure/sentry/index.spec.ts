import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  sentryInitMock,
  startProfilerMock,
  nodeProfilingIntegrationMock,
  profilingIntegrationMock,
  getSentryConfigMock,
} = vi.hoisted(() => {
  const integration = { name: "ProfilingIntegration" };
  return {
    sentryInitMock: vi.fn(),
    startProfilerMock: vi.fn(),
    nodeProfilingIntegrationMock: vi.fn(() => integration),
    profilingIntegrationMock: integration,
    getSentryConfigMock: vi.fn(() => ({
      dsn: "https://dsn",
      environment: "staging",
      release: "1.2.3",
    })),
  };
});

vi.mock("@sentry/node", () => ({
  init: sentryInitMock,
  profiler: { startProfiler: startProfilerMock },
}));

vi.mock("@sentry/profiling-node", () => ({
  nodeProfilingIntegration: nodeProfilingIntegrationMock,
}));

vi.mock("@config/sentry", () => ({ getSentryConfig: getSentryConfigMock }));

const loadSentry = async () => {
  vi.resetModules();
  await import(".");
};

describe("Config: sentry initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSentryConfigMock.mockReturnValue({
      dsn: "https://dsn",
      environment: "staging",
      release: "1.2.3",
    });
  });

  it("should initialize sentry with the resolved config and the profiling integration", async () => {
    await loadSentry();

    expect(getSentryConfigMock).toHaveBeenCalledOnce();
    expect(nodeProfilingIntegrationMock).toHaveBeenCalledOnce();
    expect(sentryInitMock).toHaveBeenCalledWith({
      dsn: "https://dsn",
      environment: "staging",
      release: "1.2.3",
      integrations: [profilingIntegrationMock],
    });
  });

  it("should start the profiler only after sentry has been initialized", async () => {
    await loadSentry();

    expect(startProfilerMock).toHaveBeenCalledOnce();
    expect(sentryInitMock.mock.invocationCallOrder[0]).toBeLessThan(
      startProfilerMock.mock.invocationCallOrder[0],
    );
  });

  it("should forward the config resolved at import time", async () => {
    getSentryConfigMock.mockReturnValue({
      dsn: "https://other-dsn",
      environment: "production",
      release: "9.9.9",
    });

    await loadSentry();

    expect(sentryInitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://other-dsn",
        environment: "production",
        release: "9.9.9",
      }),
    );
  });
});
