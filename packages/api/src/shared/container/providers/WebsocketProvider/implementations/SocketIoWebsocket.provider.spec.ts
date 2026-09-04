import { beforeEach, describe, expect, it, vi } from "vitest";

// Provider import
import { SocketIoWebsocketProvider } from "./SocketIoWebsocket.provider";

const { getBusMock, getServerMock, busMock, serverMock, emitMock } = vi.hoisted(
  () => {
    const emit = vi.fn();
    const server = { to: vi.fn(() => ({ emit })) };
    const bus = { on: vi.fn(), once: vi.fn(), off: vi.fn() };
    return {
      getBusMock: vi.fn(),
      getServerMock: vi.fn(),
      busMock: bus,
      serverMock: server,
      emitMock: emit,
    };
  },
);

vi.mock("@shared/infrastructure/websocket/adapter", () => ({
  WebsocketAdapter: { getBus: getBusMock, getServer: getServerMock },
}));

describe("Provider: SocketIoWebsocketProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBusMock.mockResolvedValue(busMock);
    getServerMock.mockResolvedValue(serverMock);
  });

  it("should resolve the bus and server on initialization", async () => {
    const provider = new SocketIoWebsocketProvider();
    await provider.initialization;

    expect(getBusMock).toHaveBeenCalledOnce();
    expect(getServerMock).toHaveBeenCalledOnce();
  });

  it("should emit an event to the target room", async () => {
    const provider = new SocketIoWebsocketProvider();
    await provider.initialization;

    await provider.sendMessageToRoom("room-1", "pong");

    expect(serverMock.to).toHaveBeenCalledWith("room-1");
    expect(emitMock).toHaveBeenCalledWith("pong");
  });

  it("should register a persistent listener on the bus", async () => {
    const provider = new SocketIoWebsocketProvider();
    await provider.initialization;

    const listener = vi.fn();
    provider.on("initialized", listener);

    expect(busMock.on).toHaveBeenCalledWith("initialized", listener);
  });

  it("should register a one-time listener on the bus", async () => {
    const provider = new SocketIoWebsocketProvider();
    await provider.initialization;

    const listener = vi.fn();
    provider.once("initialized", listener);

    expect(busMock.once).toHaveBeenCalledWith("initialized", listener);
  });

  it("should remove a listener from the bus", async () => {
    const provider = new SocketIoWebsocketProvider();
    await provider.initialization;

    const listener = vi.fn();
    provider.off("initialized", listener);

    expect(busMock.off).toHaveBeenCalledWith("initialized", listener);
  });
});
