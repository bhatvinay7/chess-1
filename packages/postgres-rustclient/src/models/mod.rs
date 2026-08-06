pub mod game;
pub mod game_state;
pub mod r#move;
pub mod puzzle;
pub mod tournament;
pub mod tournament_participant;
pub mod tournament_round;
pub mod tournament_settings;
pub mod user;

// ── Re-exports: existing models ───────────────────────────────────────────────

pub use game::{Game, GameResult, GameStatus};
pub use game_state::GameState;
pub use puzzle::Puzzle;
pub use r#move::Move;
pub use user::{AuthType, RatingCategory, User, UserAuth, UserRating};

// ── Re-exports: tournament core ───────────────────────────────────────────────

pub use tournament::{
    GameType, TieBreakMethod, TimeControl, TimeControlCategory, Tournament, TournamentAccessType,
    TournamentStatus, TournamentTimeManagement, TournamentType, TournamentVisibility,
};

// ── Re-exports: tournament settings ──────────────────────────────────────────

pub use tournament_settings::{
    ArenaSettings, DailySettings, PairingEngine, PairingLogic, SwissSettings,
};

// ── Re-exports: participants, standings, invites, byes ────────────────────────

pub use tournament_participant::{
    ByeType, TournamentBye, TournamentInvite, TournamentInviteStatus, TournamentParticipant,
    TournamentPlayerStats, TournamentRole, TournamentStanding,
};

// ── Re-exports: rounds, matches, groups, pairing audits ───────────────────────

pub use tournament_round::{
    Color, MatchStatus, PairingAudit, PairingStatus, ResultType, Round, RoundStatus,
    TournamentGroup, TournamentMatch,
};
