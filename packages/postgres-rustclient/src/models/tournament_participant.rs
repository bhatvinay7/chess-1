use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Enums ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TournamentRole", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TournamentRole {
    Player,
    Director,
    Admin,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(
    type_name = "TournamentInviteStatus",
    rename_all = "SCREAMING_SNAKE_CASE"
)]
pub enum TournamentInviteStatus {
    Pending,
    Accepted,
    Rejected,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "ByeType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ByeType {
    FullPoint,
    HalfPoint,
    ZeroPoint,
}

// ── TournamentParticipant ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentParticipant {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "playerId")]
    pub player_id: Uuid,
    pub role: TournamentRole,
    pub seed: Option<i32>,
    #[sqlx(rename = "ratingAtJoin")]
    pub rating_at_join: Option<i32>,
    #[sqlx(rename = "joinedAt")]
    pub joined_at: DateTime<Utc>,
}

// ── TournamentPlayerStats ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentPlayerStats {
    pub id: String,
    #[sqlx(rename = "tournamentParticipantId")]
    pub tournament_participant_id: String,
    pub score: f64,
    pub wins: i32,
    pub draws: i32,
    pub losses: i32,
    #[sqlx(rename = "currentRank")]
    pub current_rank: Option<i32>,
    #[sqlx(rename = "byeReceived")]
    pub bye_received: bool,
    #[sqlx(rename = "consecutiveWhite")]
    pub consecutive_white: i32,
    #[sqlx(rename = "consecutiveBlack")]
    pub consecutive_black: i32,
    #[sqlx(rename = "totalWhiteGames")]
    pub total_white_games: i32,
    #[sqlx(rename = "totalBlackGames")]
    pub total_black_games: i32,
    pub buchholz: f64,
    #[sqlx(rename = "medianBuchholz")]
    pub median_buchholz: f64,
    #[sqlx(rename = "sonnebornBerger")]
    pub sonneborn_berger: f64,
    #[sqlx(rename = "cumulativeScore")]
    pub cumulative_score: f64,
    #[sqlx(rename = "performanceRating")]
    pub performance_rating: Option<f64>,
    #[sqlx(rename = "directEncounterScore")]
    pub direct_encounter_score: f64,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

// ── TournamentStanding ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentStanding {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "playerId")]
    pub player_id: Uuid,
    pub rank: i32,
    pub score: f64,
    pub wins: i32,
    pub draws: i32,
    pub losses: i32,
    pub buchholz: f64,
    #[sqlx(rename = "medianBuchholz")]
    pub median_buchholz: f64,
    #[sqlx(rename = "sonnebornBerger")]
    pub sonneborn_berger: f64,
    #[sqlx(rename = "directEncounterScore")]
    pub direct_encounter_score: f64,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

// ── TournamentBye ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentBye {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "playerId")]
    pub player_id: Uuid,
    #[sqlx(rename = "roundNumber")]
    pub round_number: i32,
    #[sqlx(rename = "byeType")]
    pub bye_type: ByeType,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

// ── TournamentInvite ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TournamentInvite {
    pub id: String,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: String,
    #[sqlx(rename = "invitedPlayerId")]
    pub invited_player_id: Uuid,
    #[sqlx(rename = "invitedById")]
    pub invited_by_id: Uuid,
    pub status: TournamentInviteStatus,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}
