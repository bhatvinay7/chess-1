import { createClient } from "redis";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { createAdapter } from "@socket.io/redis-adapter";

dotenv.config();

export class SocketIORedisAdapter {
  static async setup(io: Server): Promise<void> {
    const rawUrl = process.env.REDIS_URL;
    const url = rawUrl
      ? rawUrl.trim().replace(/^['"]|['"]$/g, "")
      : "redis://localhost:6379";
    const pubClient = createClient({
      url,
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter attached to Socket.IO");
  }
}
