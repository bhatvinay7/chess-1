use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Move {
    pub id: Uuid,
    #[sqlx(rename = "gameId")]
    pub game_id: Uuid,
    #[sqlx(rename = "playerId")]
    pub player_id: Uuid,
    #[sqlx(rename = "moveNumber")]
    pub move_number: i32,
    pub san: String,
    pub uci: Option<String>,
    #[sqlx(rename = "fenAfter")]
    pub fen_after: String,
    #[sqlx(rename = "fromSquare")]
    pub from_square: Option<String>,
    #[sqlx(rename = "toSquare")]
    pub to_square: Option<String>,
    pub promotion: Option<String>,
    #[sqlx(rename = "timeTakenMs")]
    pub time_taken_ms: Option<i32>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}
