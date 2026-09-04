import { afterEach, describe, expect, it } from "vitest";
import { AddressInfo } from "node:net";
import { io, Socket } from "socket.io-client";

// Util import
import { createAuthorizedWorker } from "@/test/utils/workerAuth.util";

// Type import
import { TestContext } from "@/test/types/testContext.type";

// Adapter import
import { WebsocketAdapter } from "./adapter";

const clients: Socket[] = [];

const listen = async (context: TestContext): Promise<number> => {
  const { httpServer } = context.app!;

  await new Promise<void>(resolve => {
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  return (httpServer.address() as AddressInfo).port;
};

const connect = (
  port: number,
  auth: Record<string, unknown>,
): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const client = io(`http://127.0.0.1:${port}`, {
      path: "/websocket",
      transports: ["websocket"],
      reconnection: false,
      auth,
    });

    clients.push(client);

    client.on("connect", () => resolve(client));
    client.on("connect_error", error => reject(error));
  });

afterEach(() => {
  while (clients.length) clients.pop()?.disconnect();
});

describe("E2E: WebsocketApp", () => {
  it("should answer a ping with a pong for a connected worker", async context => {
    const { accessToken } = await createAuthorizedWorker();
    const port = await listen(context);

    const client = await connect(port, {
      kind: "WORKER",
      token: `Bearer ${accessToken}`,
    });

    const pong = new Promise<void>(resolve => {
      client.on("pong", () => resolve());
    });

    client.emit("ping");

    await expect(pong).resolves.toBeUndefined();
  });

  it("should broadcast the worker status on the adapter bus", async context => {
    const { worker, accessToken } = await createAuthorizedWorker();
    const port = await listen(context);

    const client = await connect(port, {
      kind: "WORKER",
      token: `Bearer ${accessToken}`,
    });

    const bus = await WebsocketAdapter.getBus();

    const status = new Promise<any>(resolve => {
      bus.once("worker:status", message => resolve(message));
    });

    client.emit("worker:status", { status: "IDLE" } as any);

    await expect(status).resolves.toEqual(
      expect.objectContaining({ worker_id: worker.id }),
    );
  });

  it("should broadcast a processing acquisition on the adapter bus", async context => {
    const { worker, accessToken } = await createAuthorizedWorker();
    const port = await listen(context);

    const client = await connect(port, {
      kind: "WORKER",
      token: `Bearer ${accessToken}`,
    });

    const bus = await WebsocketAdapter.getBus();
    const processing_id = "processing-acquired-id";

    const acquired = new Promise<void>(resolve => {
      bus.once(`worker:${worker.id}:processing:${processing_id}:acquired`, () =>
        resolve(),
      );
    });

    client.emit("worker:processing-acquired", { processing_id } as any);

    await expect(acquired).resolves.toBeUndefined();
  });

  it("should connect a user with a valid access token", async context => {
    await context.userAuthorized(context.request.get("/health"));
    const port = await listen(context);

    const client = await connect(port, {
      kind: "USER",
      token: `Bearer ${context.userSession.idToken}`,
    });

    expect(client.connected).toBe(true);
  });

  it("should reject a worker with an invalid access token", async context => {
    const port = await listen(context);

    await expect(
      connect(port, { kind: "WORKER", token: "Bearer invalid-access-token" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("should reject a user with an invalid access token", async context => {
    const port = await listen(context);

    await expect(
      connect(port, { kind: "USER", token: "Bearer invalid-access-token" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("should reject a connection without an authentication kind", async context => {
    const port = await listen(context);

    await expect(connect(port, {})).rejects.toThrow("Unauthorized");
  });
});
