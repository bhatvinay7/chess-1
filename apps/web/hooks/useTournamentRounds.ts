"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchTournamentRounds,
  type TournamentRoundDetail,
  type TournamentSocketData,
} from "../app/lib/api/tournaments";

// ── Unified domain types ──────────────────────────────────────────────────────

export interface UnifiedPlayer {
  id: string;
  username: string;
  profileImageUrl: string | null;
}

export interface UnifiedMatch {
  matchId: string;
  gameId: string;
  gameState: string; // IN_PROGRESS | WHITE_WIN | BLACK_WIN | DRAW | ABANDONED | WAITING | INITIALIZED
  white: UnifiedPlayer | null;
  black: UnifiedPlayer | null;
  winnerId: string | null;
  scheduledStartMs: number | null;
}

export interface UnifiedPlayerRow {
  playerId: string;
  username: string;
  score: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
}

export interface UnifiedGroup {
  groupId: string;
  groupNumber: number;
  standings: UnifiedPlayerRow[];
  matches: UnifiedMatch[];
  isComplete: boolean;
}

export interface UnifiedRoundStanding {
  playerId: string;
  username: string;
  groupId: string;
  groupRank: number;
  groupScore: number;
}

export interface UnifiedRound {
  roundId: string;
  roundNumber: number;
  status: string; // IN_PROGRESS | COMPLETED | NOT_INITIALIZED
  groups: UnifiedGroup[];
  roundStandings: UnifiedRoundStanding[];
}

export type DataSource = "socket" | "api" | "loading" | "idle";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute standings from match results when socket data is unavailable. */
function computeStandingsFromMatches(
  players: TournamentRoundDetail["groups"][number]["players"],
  matches: TournamentRoundDetail["groups"][number]["matches"],
): UnifiedPlayerRow[] {
  const map = new Map<string, UnifiedPlayerRow>();
  for (const p of players) {
    map.set(p.id, {
      playerId: p.id,
      username: p.username,
      score: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      byes: 0,
    });
  }
  for (const m of matches) {
    if (!m.whitePlayer || !m.blackPlayer) continue;
    const w = map.get(m.whitePlayer.id);
    const b = map.get(m.blackPlayer.id);
    if (!w || !b) continue;
    if (m.status === "WHITE_WIN") {
      w.wins++;
      w.score += 0.5;
      b.losses++;
    } else if (m.status === "BLACK_WIN") {
      b.wins++;
      b.score += 0.5;
      w.losses++;
    } else if (m.status === "DRAW") {
      w.draws++;
      w.score += 0.5;
      b.draws++;
      b.score += 0.5;
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

function apiMatchToUnified(
  m: TournamentRoundDetail["groups"][number]["matches"][number],
): UnifiedMatch {
  return {
    matchId: m.matchId,
    gameId: m.gameId,
    gameState: m.gameState ?? m.status,
    white: m.whitePlayer
      ? {
          id: m.whitePlayer.id,
          username: m.whitePlayer.username,
          profileImageUrl: m.whitePlayer.profileImageUrl ?? null,
        }
      : null,
    black: m.blackPlayer
      ? {
          id: m.blackPlayer.id,
          username: m.blackPlayer.username,
          profileImageUrl: m.blackPlayer.profileImageUrl ?? null,
        }
      : null,
    winnerId: m.winnerId,
    scheduledStartMs: m.scheduledStartMs ?? null,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface Params {
  tournamentId: string;
  liveData: TournamentSocketData | null;
  isLive: boolean; // tournament status === IN_PROGRESS
  active: boolean; // tab is currently visible
}

interface Return {
  rounds: UnifiedRound[];
  loading: boolean;
  source: DataSource;
  refresh: () => void;
}

export function useTournamentRounds({
  tournamentId,
  liveData,
  isLive,
  active,
}: Params): Return {
  const [apiRounds, setApiRounds] = useState<TournamentRoundDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedId, setFetchedId] = useState<string | null>(null);

  // Always fetch API for the authoritative round/group/match structure.
  // Re-fetch when the tab becomes active or the tournament id changes.
  useEffect(() => {
    if (!active) return;
    if (fetchedId === tournamentId) return;
    setLoading(true);
    fetchTournamentRounds(tournamentId)
      .then((res) => {
        setApiRounds(res.data.rounds);
        setFetchedId(tournamentId);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [active, tournamentId, fetchedId]);

  const refresh = () => {
    setFetchedId(null); // force re-fetch on next render
  };

  // Merge: API structure (match results + player list) overlaid with socket
  // standings (live scores) when the tournament is live and socket is connected.
  const rounds = useMemo<UnifiedRound[]>(() => {
    if (!apiRounds.length) return [];

    return apiRounds.map((apiRound): UnifiedRound => {
      // Match this API round to a socket round by roundId
      const socketRound = liveData?.rounds.find(
        (r) => r.roundId === apiRound.roundId,
      );

      const groups: UnifiedGroup[] = apiRound.groups.map(
        (apiGroup): UnifiedGroup => {
          const matches = apiGroup.matches.map(apiMatchToUnified);

          const doneCount = matches.filter((m) =>
            ["WHITE_WIN", "BLACK_WIN", "DRAW", "ABANDONED"].includes(
              m.gameState,
            ),
          ).length;
          const isComplete = doneCount === matches.length && matches.length > 0;

          // Standings: prefer socket (real-time) when live, otherwise compute from matches
          const socketGroup = socketRound?.groups.find(
            (g) => g.groupId === apiGroup.groupId,
          );
          const standings: UnifiedPlayerRow[] = socketGroup?.standings.length
            ? socketGroup.standings.map((s) => ({
                playerId: s.playerId,
                username: s.username,
                score: s.score,
                wins: s.wins,
                draws: s.draws,
                losses: s.losses,
                byes: s.byes,
              }))
            : computeStandingsFromMatches(apiGroup.players, apiGroup.matches);

          return {
            groupId: apiGroup.groupId,
            groupNumber: apiGroup.groupNumber,
            standings,
            matches,
            isComplete,
          };
        },
      );

      const roundStandings: UnifiedRoundStanding[] =
        socketRound?.roundStandings.map((rs) => ({
          playerId: rs.playerId,
          username: rs.username,
          groupId: rs.groupId,
          groupRank: rs.groupRank,
          groupScore: rs.groupScore,
        })) ?? [];

      return {
        roundId: apiRound.roundId,
        roundNumber: apiRound.roundNumber,
        status: apiRound.status ?? (isLive ? "IN_PROGRESS" : "COMPLETED"),
        groups,
        roundStandings,
      };
    });
  }, [apiRounds, liveData, isLive]);

  const source: DataSource = loading
    ? "loading"
    : !apiRounds.length
      ? "idle"
      : isLive && liveData
        ? "socket"
        : "api";

  return { rounds, loading, source, refresh };
}
