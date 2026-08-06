use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Puzzle {
    pub id: Uuid,
    #[sqlx(rename = "initialFen")]
    pub initial_fen: String,
    pub solution: Value,
    #[sqlx(rename = "movesToMate")]
    pub moves_to_mate: i32,
    pub rating: i32,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}
