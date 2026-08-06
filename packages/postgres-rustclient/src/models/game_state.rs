use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GameState {
    pub id: Uuid,
    #[sqlx(rename = "gameId")]
    pub game_id: Uuid,
    #[sqlx(rename = "whitePlayerLeftTime")]
    pub white_player_left_time: i32,
    #[sqlx(rename = "blackPlayerLeftTime")]
    pub black_player_left_time: i32,
    pub increment: i32,
    #[sqlx(rename = "timeSlot")]
    pub time_slot: String,
    #[sqlx(rename = "gameState")]
    pub game_state: String,
    #[sqlx(rename = "gameMode")]
    pub game_mode: String,
    #[sqlx(rename = "isRated")]
    pub is_rated: bool,
    #[sqlx(rename = "winnerId")]
    pub winner_id: Option<Uuid>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
