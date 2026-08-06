import { Server, Socket } from "socket.io";
import { ChatHandler } from "./handlers/chat.event.js";

export class EventRegistry {
  static handle(io: Server, socket: Socket) {
    const chatHandler = new ChatHandler(io, socket);
    chatHandler.register();

    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} quit: ${reason}`);
    });
  }
}
