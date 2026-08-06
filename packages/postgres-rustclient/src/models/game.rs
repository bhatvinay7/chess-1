use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "GameStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameStatus {
    Waiting,
    Active,
    Draw,
    WhiteWin,
    BlackWin,
    Abandoned,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "GameResult", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameResult {
    Win,
    Loss,
    Draw,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Game {
    pub id: Uuid,
    #[sqlx(rename = "whitePlayerId")]
    pub white_player_id: Uuid,
    #[sqlx(rename = "blackPlayerId")]
    pub black_player_id: Option<Uuid>,
    #[sqlx(rename = "winnerId")]
    pub winner_id: Option<Uuid>,
    #[sqlx(rename = "puzzleId")]
    pub puzzle_id: Option<Uuid>,
    #[sqlx(rename = "initialFen")]
    pub initial_fen: String,
    #[sqlx(rename = "currentFen")]
    pub current_fen: String,
    pub pgn: String,
    pub status: GameStatus,
    #[sqlx(rename = "timeControl")]
    pub time_control: String,
    #[sqlx(rename = "gameMode")]
    pub game_mode: String,
    #[sqlx(rename = "isRated")]
    pub is_rated: bool,
    #[sqlx(rename = "whiteRating")]
    pub white_rating: Option<i32>,
    #[sqlx(rename = "blackRating")]
    pub black_rating: Option<i32>,
    #[sqlx(rename = "whiteRatingAfter")]
    pub white_rating_after: Option<i32>,
    #[sqlx(rename = "blackRatingAfter")]
    pub black_rating_after: Option<i32>,
    #[sqlx(rename = "whiteRatingGain")]
    pub white_rating_gain: Option<i32>,
    #[sqlx(rename = "blackRatingGain")]
    pub black_rating_gain: Option<i32>,
    #[sqlx(rename = "startedAt")]
    pub started_at: Option<DateTime<Utc>>,
    #[sqlx(rename = "endedAt")]
    pub ended_at: Option<DateTime<Utc>>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
