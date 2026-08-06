use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ── Enums ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "PairingEngine", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PairingEngine {
    Dutch,
    Burstein,
    Accelerated,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "PairingLogic", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PairingLogic {
    ScoreBased,
    RatingBased,
}

// ── SwissSettings ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SwissSettings {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "totalRounds")]
    pub total_rounds: i32,
    #[sqlx(rename = "pairingEngine")]
    pub pairing_engine: PairingEngine,
    #[sqlx(rename = "preventRepeatPairs")]
    pub prevent_repeat_pairs: bool,
    #[sqlx(rename = "balanceColors")]
    pub balance_colors: bool,
    #[sqlx(rename = "avoidThreeSameColors")]
    pub avoid_three_same_colors: bool,
    #[sqlx(rename = "allowBye")]
    pub allow_bye: bool,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

// ── ArenaSettings ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ArenaSettings {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "durationMinutes")]
    pub duration_minutes: i32,
    #[sqlx(rename = "pairingLogic")]
    pub pairing_logic: PairingLogic,
    #[sqlx(rename = "berserkEnabled")]
    pub berserk_enabled: bool,
    #[sqlx(rename = "streakBonusEnabled")]
    pub streak_bonus_enabled: bool,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

// ── DailySettings ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DailySettings {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "groupSize")]
    pub group_size: i32,
    #[sqlx(rename = "advancePerGroup")]
    pub advance_per_group: i32,
    #[sqlx(rename = "concurrentGamesPerOpponent")]
    pub concurrent_games_per_opponent: i32,
    #[sqlx(rename = "daysPerMove")]
    pub days_per_move: i32,
    #[sqlx(rename = "allowVacation")]
    pub allow_vacation: bool,
    #[sqlx(rename = "useTieBreaks")]
    pub use_tie_breaks: bool,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}
