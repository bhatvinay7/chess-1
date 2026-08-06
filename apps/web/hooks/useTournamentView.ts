"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "./useSocket/socketConnection";
import {
  fetchTournamentRounds,
  type TournamentRoundDetail,
  type TournamentSocketData,
} from "../app/lib/api/tournaments";

interface UseTournamentViewReturn {
  liveData: TournamentSocketData | null;
  rounds: TournamentRoundDetail[];
  loadingRounds: boolean;
  socketConnected: boolean;
  refresh: () => void;
}

export function useTournamentView(
  tournamentId: string,
  userId: string | undefined,
  isParticipant: boolean,
  isActive: boolean,
): UseTournamentViewReturn {
  const socketSvc = useSocket();
  const [liveData, setLiveData] = useState<TournamentSocketData | null>(null);
  const [rounds, setRounds] = useState<TournamentRoundDetail[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const subscribedRef = useRef(false);

  // Fetch static group / match structure from HTTP API (Redis-first, DB fallback handled server-side)
  useEffect(() => {
    if (!isActive) return;
    setLoadingRounds(true);
    fetchTournamentRounds(tournamentId)
      .then((res) => setRounds(res.data.rounds))
      .catch(console.error)
      .finally(() => setLoadingRounds(false));
  }, [tournamentId, isActive]);

  // Subscribe to live standings via socket — available to all viewers, not just participants
  useEffect(() => {
    if (!isActive) return;

    const trySubscribe = () => {
      const s = socketSvc.socket;
      if (!s?.connected || subscribedRef.current) return;

      subscribedRef.current = true;

      const handleData = (data: TournamentSocketData) => {
        setLiveData(data);
        setSocketConnected(true);
      };
      const handleError = () => setSocketConnected(false);

      s.on("tournament:data", handleData);
      s.on("tournament:error", handleError);
      s.emit("tournament:view", { tournamentId, userId: userId ?? null });

      return () => {
        s.off("tournament:data", handleData);
        s.off("tournament:error", handleError);
        subscribedRef.current = false;
      };
    };

    const cleanup = trySubscribe();

    // If socket isn't connected yet, wait for it
    const s = socketSvc.socket;
    if (s && !s.connected) {
      s.once("connect", () => {
        subscribedRef.current = false;
        trySubscribe();
      });
    }

    return () => {
      cleanup?.();
    };
  }, [tournamentId, userId, isActive, socketSvc.socket]);

  const refresh = useCallback(() => {
    const s = socketSvc.socket;
    if (!s?.connected) return;
    s.emit("tournament:view", { tournamentId, userId: userId ?? null });
  }, [tournamentId, userId, socketSvc.socket]);

  return { liveData, rounds, loadingRounds, socketConnected, refresh };
}
