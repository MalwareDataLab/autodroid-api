import { EventEmitter } from "node:stream";

// Type import
import { WebsocketServer } from "./types";
import { ISocketWorkerStatusMessage } from "./socket.types";

interface WebsocketAdapterEvents {
  initialized: [];

  "worker:status": [{ worker_id: string } & ISocketWorkerStatusMessage];
  [key: `worker:${string}:status`]: [ISocketWorkerStatusMessage];
}

type WebsocketAdapterBus = EventEmitter<WebsocketAdapterEvents>;

class WebsocketAdapterClass {
  private bus: WebsocketAdapterBus;
  public readonly initialization: Promise<void>;

  private websocketServer: WebsocketServer;

  constructor() {
    this.bus = new EventEmitter();
    this.initialization = new Promise(resolve => {
      this.bus.on("initialized", resolve);
    });
  }

  public async getServer(): Promise<WebsocketServer> {
    await this.initialization;
    return this.websocketServer;
  }

  public async getBus(): Promise<WebsocketAdapterBus> {
    await this.initialization;
    return this.bus;
  }

  public initialize(server: WebsocketServer): WebsocketAdapterBus {
    this.websocketServer = server;
    this.bus.emit("initialized");
    return this.bus;
  }
}

const WebsocketAdapter = new WebsocketAdapterClass();

export type { WebsocketAdapterEvents, WebsocketAdapterBus };
export { WebsocketAdapter };
