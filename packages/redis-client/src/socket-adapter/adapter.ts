import { createClient } from "redis";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { createAdapter } from "@socket.io/redis-adapter";

dotenv.config();

export class SocketIORedisAdapter {
  static async setup(io: Server): Promise<void> {
    const pubClient = createClient({
      url: process.env.REDIS_URL! ?? "redis://localhost:6379",
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter attached to Socket.IO");
  }
}
