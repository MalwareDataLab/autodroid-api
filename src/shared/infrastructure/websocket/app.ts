import { Redis } from "ioredis";
import { Server } from "node:http";
import { Server as SocketIoServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

// Configuration import
import { getRedisConfig } from "@config/redis";
import { getCorsConfig } from "@config/cors";

// Middleware import
import { websocketUserAuthenticationMiddleware } from "@modules/user/infrastructure/websocket/middlewares/websocketUserAuthentication.middleware";
import { websocketWorkerAuthenticationMiddleware } from "@modules/worker/infrastructure/websocket/middlewares/websocketWorkerAuthentication.middleware";
import { websocketAuthenticationGuardMiddleware } from "./middlewares/websocketAuthenticationGuard.middleware";

// Type import
import { WebsocketServer } from "./types";

// Adapter import
import { WebsocketAdapter } from "./adapter";

class WebsocketApp {
  public readonly initialization: Promise<void>;

  public readonly server: WebsocketServer;
  private readonly pubClient: Redis;
  private readonly subClient: Redis;

  constructor(httpServer: Server) {
    this.initialization = Promise.resolve();

    this.server = new SocketIoServer(httpServer, {
      path: "/websocket",
      cors: {
        origin: getCorsConfig().origin,
      },
    });
    this.pubClient = new Redis(getRedisConfig());
    this.subClient = this.pubClient.duplicate();

    this.server.adapter(createAdapter(this.pubClient, this.subClient) as any);

    this.middlewares();

    const bus = WebsocketAdapter.initialize(this.server);

    this.server.on("connection", socket => {
      socket.on("ping", () => {
        socket.emit("pong");
      });

      socket.on("worker:status", data => {
        bus.emit(`worker:status`, {
          ...data,
          worker_id: socket.data.worker_session.worker.id,
        });
        bus.emit(`worker:${socket.data.worker_session.worker.id}:status`, data);
      });
    });
  }

  private middlewares(): void {
    this.server.use(websocketUserAuthenticationMiddleware);
    this.server.use(websocketWorkerAuthenticationMiddleware);
    this.server.use(websocketAuthenticationGuardMiddleware);

    this.server.use((socket, next) => {
      if (socket.data.kind === "USER" && socket.data.user_session?.user?.id) {
        socket.join(`user:${socket.data.user_session.user?.id}`);
      }

      if (
        socket.data.kind === "WORKER" &&
        socket.data.worker_session?.worker?.id
      ) {
        socket.join("worker");
        socket.join(`worker:${socket.data.worker_session.worker.id}`);
      }

      next();
    });
  }
}

export { WebsocketApp };
