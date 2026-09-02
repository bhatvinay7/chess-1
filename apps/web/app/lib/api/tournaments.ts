import axiosInstance from "../axio";
import type {
  TournamentListItem,
  CreateTournamentPayload,
  TournamentFilters,
} from "../../../components/tournament/types";

// ── Tournament rounds / group structure ────────────────────────────────────

export interface TournamentMatchPlayer {
  id: string;
  username: string;
  profileImageUrl?: string | null;
}

export interface TournamentMatch {
  matchId: string;
  gameId: string;
  scheduledStartMs: number | null;
  gameState: string;
  status: string;
  whitePlayer: TournamentMatchPlayer | null;
  blackPlayer: TournamentMatchPlayer | null;
  winnerId: string | null;
}

export interface TournamentGroupDetail {
  groupId: string;
  groupNumber: number;
  players: TournamentMatchPlayer[];
  matches: TournamentMatch[];
}

export interface TournamentRoundDetail {
  roundId: string;
  roundNumber: number;
  status?: string;
  groups: TournamentGroupDetail[];
}

export interface TournamentRoundsResponse {
  success: boolean;
  data: { rounds: TournamentRoundDetail[] };
}

export async function fetchTournamentRounds(id: string): Promise<TournamentRoundsResponse> {
  const { data } = await axiosInstance.get<TournamentRoundsResponse>(`/tournaments/${id}/rounds`);
  return data;
}

// ── Socket payload types ───────────────────────────────────────────────────

export interface PlayerStanding {
  playerId: string;
  username: string;
  score: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  games: Array<{
    gameId: string;
    opponentId: string | null;
    opponentUsername: string;
    result: string;
    color: string;
    gameState: string;
  }>;
}

export interface GroupStanding {
  groupId: string;
  groupNumber: number;
  standings: PlayerStanding[];
}

export interface RoundStanding {
  roundId: string;
  roundNumber: number;
  groups: GroupStanding[];
  roundStandings: Array<{
    playerId: string;
    username: string;
    groupId: string;
    groupRank: number;
    groupScore: number;
  }>;
}

export interface TournamentSocketData {
  tournamentId: string;
  rounds: RoundStanding[];
  myMatch: (Record<string, string> & { gameId: string }) | null;
}

export interface TournamentsResponse {
  success: boolean;
  data: TournamentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TournamentResponse {
  success: boolean;
  data: TournamentListItem;
}

export async function fetchTournaments(
  filters?: TournamentFilters & { statuses?: string },
  page = 1,
  pageSize = 100
): Promise<TournamentsResponse> {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (filters?.statuses) params.statuses = filters.statuses;
  else if (filters?.status && filters.status !== "ALL") params.status = filters.status;
  if (filters?.type && filters.type !== "ALL") params.type = filters.type;
  if (filters?.accessType && filters.accessType !== "ALL") params.accessType = filters.accessType;

  const { data } = await axiosInstance.get<TournamentsResponse>("/tournaments", { params });
  return data;
}

export async function fetchMyTournaments(): Promise<TournamentsResponse> {
  const { data } = await axiosInstance.get<TournamentsResponse>("/tournaments/my");
  return data;
}

export async function fetchTournament(id: string): Promise<TournamentResponse> {
  const { data } = await axiosInstance.get<TournamentResponse>(`/tournaments/${id}`);
  return data;
}

export async function createTournament(
  payload: CreateTournamentPayload
): Promise<TournamentResponse> {
  const { data } = await axiosInstance.post<TournamentResponse>("/tournaments", payload);
  return data;
}

export async function joinTournament(id: string): Promise<{ success: boolean; message: string }> {
  const { data } = await axiosInstance.post(`/tournaments/${id}/join`);
  return data;
}

export async function leaveTournament(id: string): Promise<{ success: boolean; message: string }> {
  const { data } = await axiosInstance.post(`/tournaments/${id}/leave`);
  return data;
}

export async function deleteTournament(id: string): Promise<{ success: boolean; message: string }> {
  const { data } = await axiosInstance.delete(`/tournaments/${id}`);
  return data;
}

export async function fetchMyTournamentGame(id: string): Promise<{ success: boolean; gameId: string | null }> {
  const { data } = await axiosInstance.get<{ success: boolean; gameId: string | null }>(`/tournaments/${id}/my-game`);
  return data;
}

export async function triggerManualRound(id: string): Promise<{ success: boolean; message: string }> {
  const { data } = await axiosInstance.post<{ success: boolean; message: string }>(`/tournaments/${id}/manual-trigger`);
  return data;
}
