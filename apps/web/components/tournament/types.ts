export type TournamentType =
  | "ARENA"
  | "CLUB_SWISS"
  | "GLOBAL_SWISS"
  | "CLUB_ROUND_ROBIN"
  | "GLOBAL_ROUND_ROBIN"
  | "DAILY";

export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "NOT_INITIALIZED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type TournamentAccessType = "CLUB" | "CROSS_CLUB" | "OPEN" | "PRIVATE";
export type TournamentVisibility = "PUBLIC" | "PRIVATE" | "CLUB_ONLY";
export type GameType = "STANDARD" | "CHESS960";
export type PairingEngine = "DUTCH" | "BURSTEIN" | "ACCELERATED";
export type PairingLogic = "SCORE_BASED" | "RATING_BASED";
export type TieBreakMethod =
  | "BUCHHOLZ"
  | "MEDIAN_BUCHHOLZ"
  | "SONNEBORN_BERGER"
  | "DIRECT_ENCOUNTER"
  | "MOST_WINS";

export interface TournamentTimeManagement {
  registrationOpenAt: string;
  registrationCloseAt: string;
  startTime: string;
  endTime?: string | null;
}

export interface TournamentCreator {
  id: string;
  username: string;
  profileImageUrl?: string | null;
}

export interface TournamentTimeControl {
  id: string;
  label: string;
  value: string;
  category: string;
}

export interface TournamentListItem {
  id: string;
  name: string;
  description?: string | null;
  tournamentType: TournamentType;
  status: TournamentStatus;
  accessType: TournamentAccessType;
  visibility: TournamentVisibility;
  gameType: GameType;
  isRated: boolean;
  inviteOnly: boolean;
  premiumOnly: boolean;
  requiresApproval: boolean;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  minRating?: number | null;
  maxRating?: number | null;
  participantCount: number;
  timeManagement: TournamentTimeManagement;
  creator: TournamentCreator;
  timeControl?: TournamentTimeControl | null;
  userRole?: "PLAYER" | "DIRECTOR" | "ADMIN" | null;
  clubId?: string | null;
}

export interface TournamentFilters {
  status?: TournamentStatus | "ALL";
  type?: TournamentType | "ALL";
  accessType?: TournamentAccessType | "ALL";
}

export interface SwissSettings {
  totalRounds: number;
  pairingEngine: PairingEngine;
  preventRepeatPairs: boolean;
  balanceColors: boolean;
  avoidThreeSameColors: boolean;
  allowBye: boolean;
}

export interface ArenaSettings {
  durationMinutes: number;
  pairingLogic: PairingLogic;
  berserkEnabled: boolean;
  streakBonusEnabled: boolean;
}

export interface DailySettings {
  groupSize: number;
  advancePerGroup: number;
  concurrentGamesPerOpponent: number;
  daysPerMove: number;
  allowVacation: boolean;
  useTieBreaks: boolean;
}

export interface CreateTournamentPayload {
  name: string;
  description?: string;
  status?: TournamentStatus;
  tournamentType: TournamentType;
  accessType: TournamentAccessType;
  visibility: TournamentVisibility;
  gameType: GameType;
  isRated: boolean;
  inviteOnly: boolean;
  premiumOnly: boolean;
  requiresApproval: boolean;
  autoStartWhenFull: boolean;
  allowVacation: boolean;
  allowLateJoin: boolean;
  useTieBreaks: boolean;
  tieBreakMethod?: TieBreakMethod;
  minPlayers?: number;
  maxPlayers?: number;
  minRating?: number;
  maxRating?: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startTime: string;
  endTime?: string;
  timeControlId?: string;
  clubId?: string;
  invitedClubIds?: string[];
  swissSettings?: SwissSettings;
  arenaSettings?: ArenaSettings;
  dailySettings?: DailySettings;
}

export interface ClubSummary {
  id: string;
  name: string;
  imageUrl?: string;
  _count?: { members: number };
}
