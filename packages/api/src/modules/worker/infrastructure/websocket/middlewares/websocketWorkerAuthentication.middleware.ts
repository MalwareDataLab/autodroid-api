/* eslint-disable no-param-reassign */
import { Socket } from "socket.io";
import { container } from "tsyringe";

// Error import
import { WebsocketUnauthorizedError } from "@shared/infrastructure/websocket/errors/WebsocketUnauthorized.error";

// Service import
import { HandleWorkerAuthenticationService } from "@modules/worker/services/handleWorkerAuthentication.service";

// Type import
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@shared/infrastructure/websocket/types";

export const websocketWorkerAuthenticationMiddleware = async (
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  next: (err?: Error) => void,
): Promise<void> => {
  const { auth } = socket.handshake;

  if (auth.kind === "WORKER" && auth.token) {
    const [, access_token] = auth.token.split(" ");

    try {
      const handleWorkerAuthenticationService = container.resolve(
        HandleWorkerAuthenticationService,
      );

      const session = await handleWorkerAuthenticationService.execute({
        access_token,
        language: (socket.request as any).language,
      });

      socket.data.kind = "WORKER";
      socket.data.worker_session = session;

      next();
    } catch {
      next(new WebsocketUnauthorizedError());
    }
  } else {
    next();
  }
};
