import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { container } from "tsyringe";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { logger } from "@shared/utils/logger";

// Provider import
import { BullJobProvider } from "./BullJob.provider";

const bullState = vi.hoisted(() => ({
  queues: [] as any[],
  repeatableJobs: {} as Record<string, { key: string; cron: string }[]>,
}));

vi.mock("bull", () => ({
  default: vi.fn((name: string, options: any) => {
    options.createClient("client", {});
    options.createClient("subscriber", {});
    options.createClient("bclient", {});

    const listeners: Record<string, (...args: any[]) => void> = {};
    const queue = {
      name,
      listeners,
      handler: undefined as any,
      process: vi.fn((_concurrency: number, handler: any) => {
        queue.handler = handler;
      }),
      on: vi.fn((event: string, callback: any) => {
        listeners[event] = callback;
      }),
      add: vi.fn(),
      pause: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getRepeatableJobs: vi
        .fn()
        .mockImplementation(async () => bullState.repeatableJobs[name] || []),
      removeRepeatableByKey: vi.fn().mockResolvedValue(undefined),
    };
    bullState.queues.push(queue);
    return queue;
  }),
}));

vi.mock("tsyringe", async importOriginal => {
  const actual = await importOriginal<typeof import("tsyringe")>();
  return { ...actual, container: { resolve: vi.fn() } };
});

vi.mock("../jobs", () => ({
  ProcessingCleanExpiredJob: class {},
  ProcessingFailDanglingJob: class {},
  RemoveAllDanglingFilesJob: class {},
  WorkerCleanMissingJob: class {},
}));

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({ logger: { info: vi.fn() } }));

const resolveMock = vi.mocked(container.resolve) as unknown as Mock<
  (token: { name: string }) => unknown
>;
const getEnvConfigMock = vi.mocked(getEnvConfig);

const redisProviderMock = { quit: vi.fn().mockResolvedValue(undefined) };

class AdapterMock {
  public initialization = Promise.resolve();

  public provider = redisProviderMock;

  constructor(_name: string, optionsFn?: (defaults: any) => any) {
    if (optionsFn) optionsFn({});
  }
}

const inMemoryDatabaseProviderMock = {
  initialization: Promise.resolve(),
  connection: {} as any,
  Adapter: AdapterMock as any,
};

const buildProvider = () =>
  new BullJobProvider(inMemoryDatabaseProviderMock as any);

describe("Provider: BullJobProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bullState.queues.length = 0;
    bullState.repeatableJobs = {};
    getEnvConfigMock.mockReturnValue({
      JOBS_ENABLED: "false",
      APP_INFO: { name: "Autodroid" },
    } as any);
    resolveMock.mockImplementation((job: any) => ({
      name: job.name,
      concurrency: 1,
      jobOptions: {},
      queueOptions: {},
      handle: vi.fn().mockResolvedValue(undefined),
      onFailed: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it("should initialize the queues without processing when jobs are disabled", async () => {
    const provider = buildProvider();
    await provider.initialization;

    expect(bullState.queues).toHaveLength(4);
    expect(bullState.queues[0].process).not.toHaveBeenCalled();
  });

  it("should process jobs and register the cron jobs when enabled", async () => {
    getEnvConfigMock.mockReturnValue({
      JOBS_ENABLED: "true",
      APP_INFO: { name: "Autodroid" },
    } as any);
    bullState.repeatableJobs = {
      ProcessingCleanExpiredJob: [
        { key: "keep-key", cron: "0 * * * *" },
        { key: "stale-key", cron: "5 * * * *" },
      ],
    };

    const provider = buildProvider();
    await provider.initialization;

    const cleanExpiredQueue = bullState.queues.find(
      queue => queue.name === "ProcessingCleanExpiredJob",
    );

    expect(cleanExpiredQueue.removeRepeatableByKey).toHaveBeenCalledWith(
      "stale-key",
    );
    expect(cleanExpiredQueue.removeRepeatableByKey).not.toHaveBeenCalledWith(
      "keep-key",
    );
    expect(cleanExpiredQueue.add).toHaveBeenCalled();
    expect(cleanExpiredQueue.process).toHaveBeenCalledOnce();
  });

  it("should default the app name to API when it is missing", async () => {
    getEnvConfigMock.mockReturnValue({
      JOBS_ENABLED: "true",
      APP_INFO: { name: undefined },
    } as any);

    const provider = buildProvider();
    await provider.initialization;

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Processing background jobs on API"),
    );
  });

  it("should run the process handler and all queue event listeners", async () => {
    getEnvConfigMock.mockReturnValue({
      JOBS_ENABLED: "true",
      APP_INFO: { name: "Autodroid" },
    } as any);

    const provider = buildProvider();
    await provider.initialization;

    const queue = bullState.queues[0];

    await queue.handler({ id: 1 }, vi.fn());

    queue.listeners.error({ message: "boom" });
    queue.listeners.waiting("job-id");
    queue.listeners.active({ id: 1 }, null);
    queue.listeners.stalled({ id: 1 });
    queue.listeners["lock-extension-failed"]({ id: 1 }, { message: "lock" });
    queue.listeners.progress({ id: 1 }, 50);
    queue.listeners.completed({ id: 1 }, "result");
    queue.listeners.completed({ id: 1 }, null);
    queue.listeners.failed({ id: 1 }, { message: "err" });
    queue.listeners.failed({ id: 1 }, { message: "" });
    queue.listeners.paused();
    queue.listeners.resumed();
    queue.listeners.cleaned();
    queue.listeners.drained();
    queue.listeners.removed({ id: 1 });

    expect(logger.info).toHaveBeenCalled();
  });

  it("should add a job to a matching module and ignore unknown modules", async () => {
    const provider = buildProvider();
    await provider.initialization;

    provider.add("ProcessingCleanExpiredJob" as any, null as any);
    const matchingQueue = bullState.queues.find(
      queue => queue.name === "ProcessingCleanExpiredJob",
    );
    expect(matchingQueue.add).toHaveBeenCalledOnce();

    provider.add("NonExistentJob" as any, null as any);
    expect(matchingQueue.add).toHaveBeenCalledOnce();
  });

  it("should stop logging and close every queue and connection", async () => {
    getEnvConfigMock.mockReturnValue({
      JOBS_ENABLED: "true",
      APP_INFO: { name: "Autodroid" },
    } as any);

    const provider = buildProvider();
    await provider.initialization;

    const queue = bullState.queues[0];

    await provider.close();

    expect(queue.pause).toHaveBeenCalledWith(true);
    expect(queue.close).toHaveBeenCalledOnce();
    expect(redisProviderMock.quit).toHaveBeenCalledTimes(
      2 + bullState.queues.length,
    );

    vi.mocked(logger.info).mockClear();
    queue.listeners.paused();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("should quit the per queue bull clients it created", async () => {
    getEnvConfigMock.mockReturnValue({
      JOBS_ENABLED: "true",
      APP_INFO: { name: "Autodroid" },
    } as any);

    const provider = buildProvider();
    await provider.initialization;

    const quitCallsBeforeClose = redisProviderMock.quit.mock.calls.length;

    await provider.close();

    expect(
      redisProviderMock.quit.mock.calls.length - quitCallsBeforeClose,
    ).toBe(2 + bullState.queues.length);
  });

  it("should close cleanly when the queues were never created", async () => {
    const rejectedInitialization = Promise.reject(new Error("redis is closed"));
    rejectedInitialization.catch(() => undefined);

    const failingProvider = new BullJobProvider({
      ...inMemoryDatabaseProviderMock,
      Adapter: class {
        public initialization = rejectedInitialization;

        public provider = redisProviderMock;
      },
    } as any);

    await expect(failingProvider.initialization).rejects.toThrow();

    await expect(failingProvider.close()).resolves.toBeUndefined();
    expect(redisProviderMock.quit).toHaveBeenCalledTimes(2);
  });
});
