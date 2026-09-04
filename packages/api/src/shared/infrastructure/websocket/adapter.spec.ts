import { describe, expect, it } from "vitest";

// Adapter import
import { WebsocketAdapter } from "./adapter";

describe("Websocket: WebsocketAdapter", () => {
  it("should expose the server and bus once initialized and resolve the initialization", async () => {
    const server: any = { id: "socket-server" };

    const bus = WebsocketAdapter.initialize(server);

    await expect(WebsocketAdapter.getServer()).resolves.toBe(server);
    await expect(WebsocketAdapter.getBus()).resolves.toBe(bus);
  });

  it("should forward emitted events through the returned bus", async () => {
    const server: any = { id: "socket-server" };
    const bus = WebsocketAdapter.initialize(server);

    const received: unknown[] = [];
    bus.on("worker:status", payload => {
      received.push(payload);
    });
    bus.emit("worker:status", {
      worker_id: "worker-id",
    } as any);

    expect(received).toHaveLength(1);
  });
});
