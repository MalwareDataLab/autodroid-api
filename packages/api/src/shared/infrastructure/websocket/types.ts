import { Server } from "socket.io";

// Entity import
import { WorkerSession } from "@modules/worker/entities/workerSession.entity";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Type import
import {
  ISocketWorkerProcessingAcquiredMessage,
  ISocketWorkerProcessingJobMessage,
  ISocketWorkerStatusMessage,
} from "./socket.types";

export interface ServerToClientEvents {
  pong: () => void;

  "worker:work": (data: ISocketWorkerProcessingJobMessage) => void;
  "worker:get-status": () => void;
}

export interface ClientToServerEvents {
  ping: () => void;

  "worker:status": (data: ISocketWorkerStatusMessage) => void;
  "worker:processing-acquired": (
    data: ISocketWorkerProcessingAcquiredMessage,
  ) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  kind: "USER" | "WORKER";
  user_session: Session;
  worker_session: WorkerSession;
}

export type WebsocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
