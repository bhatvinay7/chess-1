use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Enums ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "RoundStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RoundStatus {
    NotInitialized,
    InProgress,
    Completed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "MatchStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MatchStatus {
    NotStarted,
    InProgress,
    Completed,
    Draw,
    Abandoned,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "ResultType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResultType {
    WhiteWin,
    BlackWin,
    Draw,
    Bye,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "Color", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Color {
    White,
    Black,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "PairingStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PairingStatus {
    Generated,
    Approved,
    Published,
}

// ── Round ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Round {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "roundNumber")]
    pub round_number: i32,
    pub status: RoundStatus,
    #[sqlx(rename = "startTime")]
    pub start_time: Option<DateTime<Utc>>,
    #[sqlx(rename = "endTime")]
    pub end_time: Option<DateTime<Utc>>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

// ── TournamentGroup ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentGroup {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "roundNumber")]
    pub round_number: i32,
    #[sqlx(rename = "groupNumber")]
    pub group_number: i32,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

// ── TournamentMatch ───────────────────────────────────────────────────────────
// Named TournamentMatch to avoid collision with the Rust keyword `match`.

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentMatch {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "roundId")]
    pub round_id: Option<String>,
    #[sqlx(rename = "groupId")]
    pub group_id: Option<String>,
    #[sqlx(rename = "gameId")]
    pub game_id: Uuid,
    #[sqlx(rename = "scheduledAt")]
    pub scheduled_at: DateTime<Utc>,
    #[sqlx(rename = "isProcessed")]
    pub is_processed: bool,
    #[sqlx(rename = "startedAt")]
    pub started_at: Option<DateTime<Utc>>,
    #[sqlx(rename = "completedAt")]
    pub completed_at: Option<DateTime<Utc>>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

// ── PairingAudit ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PairingAudit {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "roundNumber")]
    pub round_number: i32,
    #[sqlx(rename = "playerAId")]
    pub player_a_id: Uuid,
    #[sqlx(rename = "playerBId")]
    pub player_b_id: Uuid,
    #[sqlx(rename = "pairingScore")]
    pub pairing_score: f64,
    #[sqlx(rename = "sameScoreGroup")]
    pub same_score_group: bool,
    #[sqlx(rename = "colorConflict")]
    pub color_conflict: bool,
    #[sqlx(rename = "repeatOpponent")]
    pub repeat_opponent: bool,
    pub status: PairingStatus,
    #[sqlx(rename = "generatedBy")]
    pub generated_by: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}
