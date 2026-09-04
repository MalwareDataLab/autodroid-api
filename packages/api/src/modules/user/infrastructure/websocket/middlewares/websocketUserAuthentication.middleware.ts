/* eslint-disable no-param-reassign */
import { Socket } from "socket.io";
import { container } from "tsyringe";

// Error import
import { WebsocketUnauthorizedError } from "@shared/infrastructure/websocket/errors/WebsocketUnauthorized.error";

// Service import
import { HandleAuthenticationService } from "@modules/authentication/services/handleAuthentication.service";

// Type import
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@shared/infrastructure/websocket/types";

export const websocketUserAuthenticationMiddleware = async (
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  next: (err?: Error) => void,
): Promise<void> => {
  const { auth } = socket.handshake;

  if (auth.kind === "USER" && auth.token) {
    const [, access_token] = auth.token.split(" ");

    try {
      const handleUserAuthenticationService = container.resolve(
        HandleAuthenticationService,
      );

      const session = await handleUserAuthenticationService.execute({
        allow_existing_only: true,
        access_token,
        language: (socket.request as any).language,
      });

      socket.data.kind = "USER";
      socket.data.user_session = session;

      next();
    } catch {
      next(new WebsocketUnauthorizedError());
    }
  } else {
    next();
  }
};
