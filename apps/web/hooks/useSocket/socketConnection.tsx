"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { io, Socket } from "socket.io-client";

export class SocketService {
  public socket: Socket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect(userId: string): void {
    if (typeof window === "undefined") return;
    if (this.socket) return;

    this.socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080",
      {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
      },
    );

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.socket?.emit("register_user", userId);
      this.startHeartbeat(userId);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
      this.stopHeartbeat();
    });
  }

  private startHeartbeat(userId: string): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("heartbeat", userId);
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();

interface SocketContextValue {
  socketService: SocketService;
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({
  socketService,
  socket: null,
});

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const pathname = usePathname();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("user_token");

    if (storedUser && token) {
      try {
        const userObj = JSON.parse(storedUser);
        if (userObj && userObj.id) {
          socketService.connect(userObj.id);
          setSocket(socketService.socket);
        }
      } catch (error) {
        console.error("Error parsing user for socket connection:", error);
      }
    } else {
      socketService.disconnect();
      setSocket(null);
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      socketService.disconnect();
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socketService, socket }}>
      {children}
    </SocketContext.Provider>
  );
}
