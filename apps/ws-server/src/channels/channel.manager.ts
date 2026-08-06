import { Server } from "socket.io";
// import { redisAdapter } from "@repo/redis-client";

// export class ChannelManager {
//   private static INTERNAL_CHANNEL = "socket:internal:broadcast";

//   static async initInternalListener(io: Server) {
//     await redisAdapter.subscribe(this.INTERNAL_CHANNEL, (message: string) => {
//       const { room, event, data } = JSON.parse(message);

//       if (room) {
//         io.to(room).emit(event, data);
//       } else {
//         io.emit(event, data);
//       }
//     });

//     console.log(`ChannelManager listening on: ${this.INTERNAL_CHANNEL}`);
//   }

//   static async triggerExternalEvent(room: string, event: string, data: Record<string, string>): Promise<void> {
//     const payload = JSON.stringify({ room, event, data });
//     await redisAdapter.publish(this.INTERNAL_CHANNEL, payload);
//   }
// }
