/* eslint-disable no-param-reassign */
import { Socket } from "socket.io";

// Type import
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@shared/infrastructure/websocket/types";
import { WebsocketUnauthorizedError } from "../errors/WebsocketUnauthorized.error";

export const websocketAuthenticationGuardMiddleware = async (
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  next: (err?: Error) => void,
): Promise<void> => {
  const { kind, ...data } = socket.data;

  if (kind === "USER" && data.user_session?.user?.id) {
    next();
  } else if (kind === "WORKER" && data.worker_session?.worker?.id) {
    next();
  } else {
    next(new WebsocketUnauthorizedError());
  }
};
