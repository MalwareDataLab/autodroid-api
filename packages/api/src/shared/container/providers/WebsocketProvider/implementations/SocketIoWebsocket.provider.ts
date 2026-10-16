// Provider import
import { IWebsocketProvider } from "../models/IWebsocket.provider";

// Type import
import {
  ServerToClientEvents,
  WebsocketServer,
} from "@shared/infrastructure/websocket/types";

// Adapter import
import { WebsocketAdapter } from "@shared/infrastructure/websocket/adapter";
import type {
  WebsocketAdapterBus,
  WebsocketAdapterEvents,
} from "@shared/infrastructure/websocket/adapter";

class SocketIoWebsocketProvider implements IWebsocketProvider {
  public readonly initialization: Promise<void>;

  private bus: WebsocketAdapterBus;
  private server: WebsocketServer;

  constructor() {
    this.initialization = this.init();
  }

  private async init() {
    this.bus = await WebsocketAdapter.getBus();
    this.server = await WebsocketAdapter.getServer();
  }

  public async sendMessageToRoom<T extends keyof ServerToClientEvents>(
    room: string | string[],
    event: T,
    ...data: Parameters<ServerToClientEvents[T]>
  ): Promise<void> {
    await this.initialization;
    this.server.to(room).emit(event, ...data);
  }

  public on<K extends keyof WebsocketAdapterEvents>(
    event: K,
    listener: K extends keyof WebsocketAdapterEvents
      ? WebsocketAdapterEvents[K] extends unknown[]
        ? (...args: WebsocketAdapterEvents[K]) => void
        : never
      : never,
  ): void {
    this.bus.on(event, listener);
  }

  public once<K extends keyof WebsocketAdapterEvents>(
    event: K,
    listener: K extends keyof WebsocketAdapterEvents
      ? WebsocketAdapterEvents[K] extends unknown[]
        ? (...args: WebsocketAdapterEvents[K]) => void
        : never
      : never,
  ): void {
    this.bus.once(event, listener);
  }

  public off<K extends keyof WebsocketAdapterEvents>(
    event: K,
    listener: K extends keyof WebsocketAdapterEvents
      ? WebsocketAdapterEvents[K] extends unknown[]
        ? (...args: WebsocketAdapterEvents[K]) => void
        : never
      : never,
  ): void {
    this.bus.off(event, listener);
  }
}

export { SocketIoWebsocketProvider };
