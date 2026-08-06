use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MatchNotificationEvent {
    pub match_id: String,
    pub game_id: String,
    pub tournament_id: String,
    pub white_player_id: String,
    pub black_player_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TournamentMatchingDlqEvent {
    pub tournament_id: String,
    pub trigger: String,
    pub attempts: u32,
    pub error_message: String,
}
