// Provider import
import { SocketIoWebsocketProvider } from "./implementations/SocketIoWebsocket.provider";

const providers = {
  socketIo: SocketIoWebsocketProvider,
};

const WebsocketProvider = providers.socketIo;

export { WebsocketProvider };
