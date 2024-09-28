// Type import
import { ServerToClientEvents } from "@shared/infrastructure/websocket/types";

export interface IWebsocketProvider {
  sendMessageToRoom<T extends keyof ServerToClientEvents>(
    room: string | string[],
    event: T,
    ...data: Parameters<ServerToClientEvents[T]>
  ): Promise<void>;
}
