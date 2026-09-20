"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "./useSocket/socketConnection";

export interface LiveGamePlayer {
  id: string | null;
  username: string;
  rating: number;
  profileImage: string | null;
}

export interface LiveGame {
  gameId: string;
  gameState: string;
  player1: LiveGamePlayer;
  player2: LiveGamePlayer;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  timeSlot: string;
  isRated: boolean;
  spectatorCount: number;
}

export function useWatchList(enabled: boolean) {
  const { socket } = useSocket();
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!socket?.connected) return;
    setLoading(true);
    socket.emit("get_live_games");
  }, [socket]);

  useEffect(() => {
    if (!socket || !enabled) return;

    function onList(data: { games: LiveGame[] }) {
      setGames(data.games ?? []);
      setLoading(false);
    }

    socket.on("live_games_list", onList);
    refresh();

    const interval = setInterval(refresh, 30_000);

    return () => {
      socket.off("live_games_list", onList);
      clearInterval(interval);
    };
  }, [socket, enabled, refresh]);

  return { games, loading, refresh };
}
