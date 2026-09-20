"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "./socketConnection";
export interface MatchmakingTicket {
  userId: string;
  elo: number;
  profileImageUrl: string;
  username: string;
  time_slot: string;
  isRated: boolean;
  gameMode?: string;
}

export interface SearchingResponse {
  message: string;
}

export interface MatchFoundResponse {
  p1: MatchmakingTicket;
  p2: MatchmakingTicket;
  game_id: string;
  time_slot: string;
}

export function useMatchmaker() {
  const { socket } = useSocket();
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchStatus, setSearchStatus] = useState<string>("");
  const [matchData, setMatchData] = useState<MatchFoundResponse | null>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    function handleSearching(data: SearchingResponse): void {
      setIsSearching(true);
      setSearchStatus(data.message || "Searching for an opponent...");
    }

    function handleMatchFound(data: MatchFoundResponse): void {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      setIsSearching(false);
      setSearchStatus("");
      setMatchData(data);
      localStorage.setItem(data.game_id, data.time_slot ?? "");
    }

    function handleError(data: { message: string }): void {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      setIsSearching(false);
      setSearchStatus(data.message || "An error occurred.");
    }

    socket.on("searching", handleSearching);
    socket.on("match_found", handleMatchFound);
    socket.on("error", handleError);

    return () => {
      socket.off("searching", handleSearching);
      socket.off("match_found", handleMatchFound);
      socket.off("error", handleError);
    };
  }, [socket]);

  const startSearch = useCallback(
    (ticket: MatchmakingTicket): void => {
      if (!socket) return;
      setMatchData(null);

      setIsSearching(true);
      setSearchStatus("Searching for an opponent...");
      socket.emit("search_opponent", ticket);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        socket.emit("leave_search", { userId: ticket.userId });
        setIsSearching(false);
        setSearchStatus("Match not found");
      }, 10000);
    },
    [socket],
  );

  const leaveSearch = useCallback(
    (userId: string): void => {
      if (!socket) return;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      socket.emit("leave_search", { userId });
      setIsSearching(false);
      setSearchStatus("");
    },
    [socket],
  );

  const abandonSearch = useCallback(
    (userId: string): void => {
      if (!socket) return;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      socket.emit("abandoned", userId);
      setIsSearching(false);
      setSearchStatus("");
    },
    [socket],
  );

  return {
    isSearching,
    searchStatus,
    matchData,
    startSearch,
    leaveSearch,
    abandonSearch,
    setMatchData,
  };
}
