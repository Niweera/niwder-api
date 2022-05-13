import { Server as IOServer, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../utilities/interfaces";
import type { Server } from "http";
import keys from "../keys";
import logging from "../middleware/logging";

export const SetupSocketIO = (server: Server): IOServer => {
  const io: IOServer = new IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: keys.SOCKET_IO_CORS,
    },
  });

  io.on("connection", (socket: Socket) => {
    logging.info("socket connected:", socket.connected);
    logging.info("client connected:", socket.id);
    socket.emit("api-alive");
    socket.on("disconnect", () => {
      logging.info(`client disconnected:`, socket.id);
    });
  });

  return io;
};
