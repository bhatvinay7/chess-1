import type { Socket } from "socket.io";
import type { SpectatorGameMap, SocketSpectateMap } from "../utils/spectateHandler.js";

// Shared in-process state across all socket connections.
// Singletons — imported directly by handlers and the server.
export const userSocketMap: Map<string, Socket> = new Map();
export const socketUserMap: Map<string, string> = new Map();
export const spectatorGameMap: SpectatorGameMap  = new Map();
export const socketSpectatingMap: SocketSpectateMap = new Map();
