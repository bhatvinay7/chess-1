export interface MoveStreamFields {
  userId: string;
  move: string;
}

export interface RedisStreamItem {
  name: string;
  messages: Array<{ id: string; message: MoveStreamFields }>;
}

export interface MatchmakingTicket {
  userId: string;
  elo: number;
  profileImageUrl: string;
  username: string;
  time_slot: string;
  isRated: boolean;
  gameMode?: string;
}
