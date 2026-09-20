import { initTelemetry, httpTracing } from "@repo/telemetry-node";
import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userAuthRoutes from "./routes/userAuthRoutes.js";
import puzzleRoutes from "./routes/puzzleRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import tournamentRoutes from "./routes/tournamentRoutes.js";
import clubRoutes from "./routes/clubRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { connectRedisClient } from "@repo/redis-client";
import { ensureTtlIndex } from "@repo/mongo-db";
import { registerMetrics } from "./metrics.js";

dotenv.config();
initTelemetry("chess-http-server");

export const app: Express = express();
app.use(httpTracing);
const allowedOrigins = new Set(
  (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);
app.use(
  cors({
    origin(origin, callback) {
      // Requests without Origin are non-browser/server-to-server requests.
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
registerMetrics(app);

app.use("/api/v1/auth/admin", authRoutes);
app.use("/api/v1/auth", userAuthRoutes);
app.use("/api/v1/puzzle", puzzleRoutes);
app.use("/api/v1/games", gameRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/tournaments", tournamentRoutes);
app.use("/api/v1/clubs", clubRoutes);
app.use("/api/v1/friends", friendRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/invites", inviteRoutes);
app.use("/api/v1/notifications", notificationRoutes);

const PORT = process.env.PORT || 3002;

if (process.env.NODE_ENV !== "test") {
  connectRedisClient().then(async () => {
    await ensureTtlIndex();
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`HTTP Server running on port ${PORT}`);
    });
  });
}
