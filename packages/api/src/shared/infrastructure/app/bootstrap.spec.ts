import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from "vitest";

const { initContainerMock, initAndWaitRequisitesMock, initMock, loggerMock } =
  vi.hoisted(() => ({
    initContainerMock: vi.fn(),
    initAndWaitRequisitesMock: vi.fn(),
    initMock: vi.fn(),
    loggerMock: { info: vi.fn(), error: vi.fn() },
  }));

vi.mock("@shared/container/index", () => ({
  initContainer: initContainerMock,
  initAndWaitRequisites: initAndWaitRequisitesMock,
}));

vi.mock("@shared/utils/logger", () => ({ logger: loggerMock }));

vi.mock("../http/server", () => ({ init: initMock }));

const loadBootstrap = async () => {
  vi.resetModules();
  const bootstrapModule = await import("./bootstrap");
  await bootstrapModule.Bootstrap;
};

describe("App: bootstrap", () => {
  let consoleClearSpy: MockInstance;
  let processExitSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    initContainerMock.mockReturnValue(undefined);
    initAndWaitRequisitesMock.mockResolvedValue(undefined);
    initMock.mockResolvedValue(undefined);

    consoleClearSpy = vi
      .spyOn(console, "clear")
      .mockImplementation(() => undefined);
    processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize the container, await the requisites and start the http server in order", async () => {
    await loadBootstrap();

    expect(consoleClearSpy).toHaveBeenCalledOnce();
    expect(initContainerMock).toHaveBeenCalledOnce();
    expect(initAndWaitRequisitesMock).toHaveBeenCalledWith();
    expect(initMock).toHaveBeenCalledOnce();

    expect(initContainerMock.mock.invocationCallOrder[0]).toBeLessThan(
      initAndWaitRequisitesMock.mock.invocationCallOrder[0],
    );
    expect(initAndWaitRequisitesMock.mock.invocationCallOrder[0]).toBeLessThan(
      initMock.mock.invocationCallOrder[0],
    );

    expect(loggerMock.error).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it("should log the failure and exit with code 1 when the requisites cannot be awaited", async () => {
    initAndWaitRequisitesMock.mockRejectedValueOnce(
      new Error("redis unreachable"),
    );

    await loadBootstrap();

    expect(initMock).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenNthCalledWith(
      1,
      "❌ Bootstrap failed. Shutting down. redis unreachable",
    );
    expect(loggerMock.error).toHaveBeenNthCalledWith(2, "redis unreachable");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should log the failure and exit with code 1 when the http server cannot start", async () => {
    initMock.mockRejectedValueOnce(new Error("port already in use"));

    await loadBootstrap();

    expect(initContainerMock).toHaveBeenCalledOnce();
    expect(loggerMock.error).toHaveBeenNthCalledWith(
      1,
      "❌ Bootstrap failed. Shutting down. port already in use",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should report an undefined message when the thrown value carries none", async () => {
    initContainerMock.mockImplementationOnce(() => {
      throw Object.create(null);
    });

    await loadBootstrap();

    expect(initAndWaitRequisitesMock).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenNthCalledWith(
      1,
      "❌ Bootstrap failed. Shutting down. undefined",
    );
    expect(loggerMock.error).toHaveBeenNthCalledWith(2, "undefined");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
