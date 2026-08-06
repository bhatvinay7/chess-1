import { Server, Socket } from "socket.io";

export class ChatHandler {
  constructor(
    private io: Server,
    private socket: Socket,
  ) {}

  register(): void {
    // TODO: implement chat event handlers
  }
}
