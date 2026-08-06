use uuid::Uuid;

// ── Constants ──────────────────────────────────────────────────────────────────

pub(super) const BASE_SWISS_GROUP_SIZE: usize = 7;
pub(super) const DEFAULT_RR_GROUP_SIZE: usize = 8;

// ── Domain types ──────────────────────────────────────────────────────────────

/// A tournament participant enriched with the data the pairing engines need.
#[derive(Debug, Clone)]
pub struct MatchPlayer {
    pub participant_id: String,
    pub player_id: Uuid,
    pub username: String,
    pub profile_image: String,
    pub rating: i32,
    pub score: f64,
    pub bye_received: bool,
    pub total_white: i32,
    pub total_black: i32,
    /// Ordered list of past opponents (player_id UUIDs), earliest first.
    pub opponent_ids: Vec<Uuid>,
    /// Corresponding colour played against each opponent ("WHITE" | "BLACK").
    pub colors_played: Vec<String>,
}

/// Snapshot of the tournament configuration needed for a round.
pub(super) struct TournamentCtx {
    pub tournament_id: String,
    pub tournament_type: String,
    pub is_rated: bool,
    pub game_type: String,
    pub time_slot: String,
    pub initial_time_sec: i64,
    pub increment_sec: i64,
    pub rr_group_size: usize,
    pub rr_advance_per_group: usize,
    pub start_time_ms: u64,
    /// Swiss: from SwissSettings.totalRounds.  RR: None (computed from player count).
    pub max_rounds: Option<usize>,
}

pub(super) type BoxError = Box<dyn std::error::Error + Send + Sync>;
