use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Enums ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(
    type_name = "TournamentAccessType",
    rename_all = "SCREAMING_SNAKE_CASE"
)]
pub enum TournamentAccessType {
    Club,
    CrossClub,
    Open,
    Private,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TournamentType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TournamentType {
    ClubSwiss,
    ClubRoundRobin,
    GlobalSwiss,
    GlobalRoundRobin,
    Daily,
    Arena,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TournamentStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TournamentStatus {
    Draft,
    RegistrationOpen,
    RegistrationClosed,
    NotInitialized,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(
    type_name = "TournamentVisibility",
    rename_all = "SCREAMING_SNAKE_CASE"
)]
pub enum TournamentVisibility {
    Public,
    Private,
    ClubOnly,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "GameType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameType {
    Standard,
    Chess960,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TieBreakMethod", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TieBreakMethod {
    Buchholz,
    MedianBuchholz,
    SonnebornBerger,
    DirectEncounter,
    MostWins,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TimeControlCategory", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TimeControlCategory {
    Bullet,
    Blitz,
    Rapid,
    Daily,
}

// ── TimeControl ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TimeControl {
    pub id: String,
    pub category: TimeControlCategory,
    #[sqlx(rename = "initialTimeSec")]
    pub initial_time_sec: Option<i32>,
    #[sqlx(rename = "incrementSec")]
    pub increment_sec: Option<i32>,
    #[sqlx(rename = "daysPerMove")]
    pub days_per_move: Option<i32>,
    #[sqlx(rename = "displayName")]
    pub display_name: String,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

// ── Tournament ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Tournament {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[sqlx(rename = "accessType")]
    pub access_type: TournamentAccessType,
    #[sqlx(rename = "tournamentType")]
    pub tournament_type: TournamentType,
    pub visibility: TournamentVisibility,
    pub status: TournamentStatus,
    #[sqlx(rename = "creatorId")]
    pub creator_id: Uuid,
    #[sqlx(rename = "clubId")]
    pub club_id: Option<String>,
    #[sqlx(rename = "gameType")]
    pub game_type: GameType,
    #[sqlx(rename = "isRated")]
    pub is_rated: bool,
    #[sqlx(rename = "inviteOnly")]
    pub invite_only: bool,
    #[sqlx(rename = "premiumOnly")]
    pub premium_only: bool,
    #[sqlx(rename = "requiresApproval")]
    pub requires_approval: bool,
    #[sqlx(rename = "autoStartWhenFull")]
    pub auto_start_when_full: bool,
    #[sqlx(rename = "allowVacation")]
    pub allow_vacation: bool,
    #[sqlx(rename = "allowLateJoin")]
    pub allow_late_join: bool,
    #[sqlx(rename = "useTieBreaks")]
    pub use_tie_breaks: bool,
    #[sqlx(rename = "tieBreakMethod")]
    pub tie_break_method: Option<TieBreakMethod>,
    #[sqlx(rename = "minPlayers")]
    pub min_players: Option<i32>,
    #[sqlx(rename = "maxPlayers")]
    pub max_players: Option<i32>,
    #[sqlx(rename = "minRating")]
    pub min_rating: Option<i32>,
    #[sqlx(rename = "maxRating")]
    pub max_rating: Option<i32>,
    #[sqlx(rename = "minGamesPlayed")]
    pub min_games_played: Option<i32>,
    #[sqlx(rename = "customFen")]
    pub custom_fen: Option<String>,
    #[sqlx(rename = "openingName")]
    pub opening_name: Option<String>,
    #[sqlx(rename = "imageUrl")]
    pub image_url: Option<String>,
    #[sqlx(rename = "timeControlId")]
    pub time_control_id: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[sqlx(rename = "deletedAt")]
    pub deleted_at: Option<DateTime<Utc>>,
}

// ── TournamentTimeManagement ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentTimeManagement {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "registrationOpenAt")]
    pub registration_open_at: chrono::NaiveDateTime,
    #[sqlx(rename = "registrationCloseAt")]
    pub registration_close_at: chrono::NaiveDateTime,
    #[sqlx(rename = "startTime")]
    pub start_time: chrono::NaiveDateTime,
    #[sqlx(rename = "endTime")]
    pub end_time: Option<chrono::NaiveDateTime>,
}
