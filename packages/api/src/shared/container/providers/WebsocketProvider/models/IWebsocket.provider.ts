// Type import
import type { WebsocketAdapterEvents } from "@shared/infrastructure/websocket/adapter";
import { ServerToClientEvents } from "@shared/infrastructure/websocket/types";

export interface IWebsocketProvider {
  readonly initialization: Promise<void>;

  sendMessageToRoom<T extends keyof ServerToClientEvents>(
    room: string | string[],
    event: T,
    ...data: Parameters<ServerToClientEvents[T]>
  ): Promise<void>;

  on<K extends keyof WebsocketAdapterEvents>(
    event: K,
    listener: K extends keyof WebsocketAdapterEvents
      ? WebsocketAdapterEvents[K] extends unknown[]
        ? (...args: WebsocketAdapterEvents[K]) => void
        : never
      : never,
  ): void;

  once<K extends keyof WebsocketAdapterEvents>(
    event: K,
    listener: K extends keyof WebsocketAdapterEvents
      ? WebsocketAdapterEvents[K] extends unknown[]
        ? (...args: WebsocketAdapterEvents[K]) => void
        : never
      : never,
  ): void;

  off<K extends keyof WebsocketAdapterEvents>(
    event: K,
    listener: K extends keyof WebsocketAdapterEvents
      ? WebsocketAdapterEvents[K] extends unknown[]
        ? (...args: WebsocketAdapterEvents[K]) => void
        : never
      : never,
  ): void;
}
