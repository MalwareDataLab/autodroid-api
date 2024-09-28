// Type import
import {
  ServerToClientEvents,
  WebsocketServer,
} from "@shared/infrastructure/websocket/types";

// Websocket adapter import
import { WebsocketAdapter } from "@shared/infrastructure/websocket/adapter";

// Interface import
import { IWebsocketProvider } from "../models/IWebsocket.provider";

class SocketIoWebsocketProvider implements IWebsocketProvider {
  public readonly initialization: Promise<void>;
  private server: WebsocketServer;

  constructor() {
    this.initialization = this.init();
  }

  private async init() {
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
}

export { SocketIoWebsocketProvider };
