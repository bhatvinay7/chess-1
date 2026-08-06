/// Shared domain types for all stream consumers.
/// Each consumer picks the type `T` that matches its stream payload.
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;

// ── Matchmaking queue ──────────────────────────────────────────────────────
fn deserialize_flexible_bool<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let value: Value = Deserialize::deserialize(deserializer)?;
    match value {
        // Handles native boolean: true / false
        Value::Bool(b) => Ok(b),

        // Handles string values: "true" / "false"
        Value::String(s) => match s.as_str() {
            "true" => Ok(true),
            "false" => Ok(false),
            _ => Err(serde::de::Error::custom(format!(
                "Invalid boolean string value: '{}'",
                s
            ))),
        },

        _ => Err(serde::de::Error::custom(
            "Expected a boolean or a string representing a boolean",
        )),
    }
}
#[derive(Debug, Deserialize, Clone)]
pub struct Player {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[allow(dead_code)]
    #[serde(rename = "profileImageUrl")]
    pub profile_image_url: String,
    #[allow(dead_code)]
    pub rating: u32,
    #[allow(dead_code)]
    pub username: String,
}

fn default_game_mode() -> String {
    "standard".to_string()
}

fn default_starting_fen() -> String {
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string()
}

/// Payload written to `matchmaking:queue` by the matchmaker service.
#[derive(Debug, Deserialize, Clone)]
pub struct MatchData {
    pub p1: Player,
    pub p2: Player,
    pub game_id: String,
    pub time_slot: String,
    #[serde(default = "default_game_mode")]
    pub game_mode: String,
    #[serde(default = "default_starting_fen")]
    pub starting_fen: String,
    #[allow(dead_code)]
    #[serde(deserialize_with = "deserialize_flexible_bool")]
    pub is_rated: bool,
}

// ── Move history stream ────────────────────────────────────────────────────

/// One move entry written to `movehistory:{gameId}` by the game-server.
///
/// Stream entry field layout (all written as a single `payload` JSON field):
/// ```json
/// {
///   "gameId":    "uuid",
///   "playerId":  "uuid",          // who made the move
///   "from":      "e2",
///   "to":        "e4",
///   "promotion": "q" | null,
///   "san":       "e4",
///   "fenAfter":  "<FEN string>",
///   "moveNumber": 1               // 1-indexed, half-moves (ply)
/// }
/// ```

/// Parsed from the `move` field of each `game:moveshistory:{gameId}` entry.
/// `gameId` is not stored here — the handler already knows it from the stream.
/// `promotion` is optional: the grpc server writes `""` for non-promotion moves.
#[derive(Debug, Deserialize, Clone)]
pub struct MoveData {
    pub from: String,
    pub to: String,
    pub san: String,
    pub fen_after: String,
    #[serde(rename = "moveNumber")]
    pub move_number: i32,
    pub promotion: Option<String>,
    #[serde(rename = "time_taken", default)]
    pub time_taken: Option<f64>,
}

/// Constructed manually from the two Redis stream fields `userId` and `move`.
#[derive(Debug, Clone)]
pub struct MoveHistoryEntry {
    pub user_id: String,
    pub move_data: MoveData,
}

// ── Game result stream ─────────────────────────────────────────────────────

/// Payload written to `game:result` stream by the game-server when a game ends.
///
/// Consuming this triggers the full sync:
///   1. XRANGE `movehistory:{gameId}` to read all moves
///   2. HGETALL `game:state:{gameId}` for final state
///   3. Batch-INSERT moves, UPDATE Game record
#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct GameResultEntry {
    #[serde(rename = "gameId")]
    pub game_id: String,
    /// None for draw / abandoned
    #[serde(rename = "winnerId")]
    pub winner_id: Option<String>,
    /// "WHITE_WIN" | "BLACK_WIN" | "DRAW" | "ABANDONED"
    pub status: String,
}

// Helper that accepts BOTH native booleans and strings

#[derive(Deserialize, Debug)]
pub struct GameStateHash {
    pub white_player_id: String,
    pub black_player_id: String,
    pub white_player_rating: i32,
    pub black_player_rating: i32,
    pub initial_fen: String,
    pub current_fen: String,
    pub game_state: String,
    pub white_player_left_time: i64,
    pub black_player_left_time: i64,
    pub increment: i64,
    pub time_slot: String,
    pub winner_id: String,
    pub game_mode: String,
    #[serde(deserialize_with = "deserialize_flexible_bool")]
    pub is_rated: bool,
    // Tournament fields — empty string for regular games, populated for tournament games.
    pub tournament_id: String,
    pub tournament_type: String,
    pub round_id: String,
    pub group_id: String,
    pub match_id: String,
    pub left_game_start_time: String,
    /// For RR double-headers: the ID of the other game in the pair.
    /// game1.paired_game_id = game2_id; game2.paired_game_id = game1_id.
    /// Empty for Swiss / regular matchmaker games.
    pub paired_game_id: String,
}

impl Default for GameStateHash {
    fn default() -> Self {
        Self {
            white_player_id: String::new(),
            black_player_id: String::new(),
            white_player_rating: 1200,
            black_player_rating: 1200,
            initial_fen: default_starting_fen(),
            current_fen: String::new(),
            game_state: String::new(),
            white_player_left_time: 0,
            black_player_left_time: 0,
            increment: 0,
            time_slot: String::new(),
            game_mode: "standard".to_string(),
            is_rated: false,
            winner_id: String::new(),
            tournament_id: String::new(),
            tournament_type: String::new(),
            round_id: String::new(),
            group_id: String::new(),
            match_id: String::new(),
            left_game_start_time: String::new(),
            paired_game_id: String::new(),
        }
    }
}

impl GameStateHash {
    /// Build from a flat `Vec<(String, String)>` returned by HGETALL.
    pub fn from_pairs(pairs: Vec<(String, String)>) -> Self {
        let mut s = Self::default();
        for (k, v) in pairs {
            match k.as_str() {
                "white_player_id" => s.white_player_id = v,
                "black_player_id" => s.black_player_id = v,
                "player1_rating" => s.white_player_rating = v.parse().unwrap_or(1200),
                "player2_rating" => s.black_player_rating = v.parse().unwrap_or(1200),
                "initial_fen" => s.initial_fen = v,
                "current_fen" => s.current_fen = v,
                "game_state" => s.game_state = v,
                "white_player_left_time" => {
                    s.white_player_left_time = v
                        .parse::<f64>()
                        .map(|f| f as i64)
                        .or_else(|_| v.parse())
                        .unwrap_or(0)
                }
                "black_player_left_time" => {
                    s.black_player_left_time = v
                        .parse::<f64>()
                        .map(|f| f as i64)
                        .or_else(|_| v.parse())
                        .unwrap_or(0)
                }
                "increment" => {
                    s.increment = v
                        .parse::<f64>()
                        .map(|f| f as i64)
                        .or_else(|_| v.parse())
                        .unwrap_or(0)
                }
                "time_slot" => s.time_slot = v,
                "gameMode" => s.game_mode = v,
                "is_rated" => s.is_rated = v == "true" || v == "1",
                "winner_id" => s.winner_id = v,
                "tournament_id" => s.tournament_id = v,
                "tournament_type" => s.tournament_type = v,
                "round_id" => s.round_id = v,
                "group_id" => s.group_id = v,
                "match_id" => s.match_id = v,
                "left_game_start_time" => s.left_game_start_time = v,
                "paired_game_id" => s.paired_game_id = v,
                _ => {}
            }
        }
        s
    }
}
