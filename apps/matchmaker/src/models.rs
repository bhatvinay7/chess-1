use actix::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlayerJoin {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub rating: u32,
    #[serde(rename = "profileImageUrl", default)]
    pub profile_image_url: String,
    #[serde(default)]
    pub timestamp: f64,
    pub username: String,
    pub time_slot: String,
    #[serde(rename = "isRated")]
    pub is_rated: bool,
    /// Game mode: "standard" (default) or "chess960"
    #[serde(rename = "gameMode", default = "default_game_mode")]
    pub game_mode: String,
}

fn default_game_mode() -> String {
    "standard".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "profileImageUrl")]
    pub profile_image_url: String,
    pub rating: u32,
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchData {
    pub p1: Player,
    pub p2: Player,
    pub game_id: String,
    pub time_slot: String,
    pub is_rated: bool,
    pub game_mode: String,
    pub starting_fen: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub game_id: String,
    pub player1: String,
    pub player2: String,
}

/// Actor message: a player staged for matchmaking.
#[derive(Message, Clone, Serialize, Deserialize)]
#[rtype(result = "()")]
pub struct StagedPlayer {
    pub raw_json: String,
    pub parsed: PlayerJoin,
    pub timestamp: f64,
}
