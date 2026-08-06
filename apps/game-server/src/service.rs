#![allow(non_snake_case)]

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use redis::{aio::ConnectionManager, AsyncCommands};
use serde_json::json;
use shakmaty::fen::Fen;
use shakmaty::{
    CastlingMode, Chess, Color, EnPassantMode, File, Move, Outcome, Position, Role, Square,
};
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

pub mod proto {
    tonic::include_proto!("chess");
}

use crate::spectate;
use proto::chess_move_service_server::ChessMoveService;
pub use proto::chess_move_service_server::ChessMoveServiceServer;
use proto::{MoveRequest, MoveResponse, SpectateRequest, SpectateResponse};

pub struct ChessMoveServiceImpl {
    pub redis: ConnectionManager,
    // game IDs that have at least one spectator; updated by background worker every 10 s
    // and immediately on RegisterSpectatedGame.
    pub watched_games: Arc<RwLock<HashSet<String>>>,
}

fn invalidResponse(
    error_reason: &str,
    game_id: &str,
    user_id: &str,
    from: &str,
    to: &str,
    promotion: &str,
) -> MoveResponse {
    MoveResponse {
        valid: false,
        new_fen: String::new(),
        game_status: String::new(),
        turn: String::new(),
        is_game_over: false,
        black_player_left_time: 0,
        white_player_left_time: 0,
        error_reason: error_reason.to_string(),
        game_id: game_id.to_string(),
        user_id: user_id.to_string(),
        move_from: from.to_string(),
        move_to: to.to_string(),
        move_promotion: promotion.to_string(),
        game_mode: "standard".to_string(), // Error responses don't strictly need it, but we satisfy the struct
    }
}

// Maps from/to squares + optional promotion to a legal shakmaty Move.
// Castling: chess.js sends king-destination (g1/c1); shakmaty uses king+rook squares.
fn findLegalMove(chess: &Chess, from: &str, to: &str, promotion: &str) -> Option<Move> {
    let from_sq: Square = from.parse().ok()?;
    let to_sq: Square = to.parse().ok()?;
    let promo: Option<Role> = match promotion {
        "q" => Some(Role::Queen),
        "r" => Some(Role::Rook),
        "b" => Some(Role::Bishop),
        "n" => Some(Role::Knight),
        _ => None,
    };

    chess
        .legal_moves()
        .iter()
        .find(|m| match m {
            Move::Normal {
                from,
                to,
                promotion: move_promo,
                ..
            } => {
                *from == from_sq && *to == to_sq &&
            // Only enforce the promotion piece when the move actually requires
            // promotion.  Clients frequently send a default "q" (or the dragged
            // piece type) for every move; ignoring it for non-promotion moves
            // mirrors chess.js behaviour in the TypeScript reference server.
            (move_promo.is_none() || *move_promo == promo)
            }
            Move::EnPassant { from, to } => *from == from_sq && *to == to_sq,
            Move::Castle { king, rook } => {
                if *king != from_sq {
                    return false;
                }
                let is_kingside = rook.file() > king.file();
                let dest = if is_kingside {
                    Square::from_coords(File::G, king.rank())
                } else {
                    Square::from_coords(File::C, king.rank())
                };
                to_sq == dest || to_sq == *rook
            }
            Move::Put { .. } => false,
        })
        .cloned()
}

#[tonic::async_trait]
impl ChessMoveService for ChessMoveServiceImpl {
    // ── ProcessMove ───────────────────────────────────────────────────────────
    async fn process_move(
        &self,
        request: Request<MoveRequest>,
    ) -> Result<Response<MoveResponse>, Status> {
        let req = request.into_inner();
        let game_id = req.game_id.clone();
        let user_id = req.user_id.clone();
        let from = req.from.clone();
        let to = req.to.clone();
        let promotion = req.promotion.clone();

        let mut conn = self.redis.clone();

        let hashKey = format!("game:state:{game_id}");

        let gameData: HashMap<String, String> = conn
            .hgetall(&hashKey)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        if !gameData.contains_key("current_fen") {
            let reason = format!("Game state not found for game {game_id}");
            eprintln!("[gRPC ProcessMove] {reason}");
            return Ok(Response::new(invalidResponse(
                &reason, &game_id, &user_id, &from, &to, &promotion,
            )));
        }

        // Block moves for tournament games that have not yet reached their
        // scheduled start time.  left_game_start_time is stored as Unix epoch ms;
        // empty string means no restriction (regular / already-started games).
        let left_game_start_ms: Option<u64> = gameData
            .get("left_game_start_time")
            .filter(|s| !s.is_empty())
            .and_then(|s| s.parse().ok());

        if let Some(start_ms) = left_game_start_ms {
            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            if now_ms < start_ms {
                let reason = "Game has not started yet.";
                eprintln!("[gRPC ProcessMove] {reason} game={game_id}");
                return Ok(Response::new(invalidResponse(
                    reason, &game_id, &user_id, &from, &to, &promotion,
                )));
            }
        }

        let chess: Chess = {
            let fen: Fen = match gameData["current_fen"].parse() {
                Ok(f) => f,
                Err(e) => {
                    return Ok(Response::new(invalidResponse(
                        &format!("Invalid FEN: {e}"),
                        &game_id,
                        &user_id,
                        &from,
                        &to,
                        &promotion,
                    )))
                }
            };

            let game_mode = gameData
                .get("gameMode")
                .map(|s| s.as_str())
                .unwrap_or("standard");
            let castling_mode = if game_mode == "chess960" {
                CastlingMode::Chess960
            } else {
                CastlingMode::Standard
            };

            match fen.into_position(castling_mode) {
                Ok(c) => c,
                Err(e) => {
                    return Ok(Response::new(invalidResponse(
                        &format!("Invalid position: {e}"),
                        &game_id,
                        &user_id,
                        &from,
                        &to,
                        &promotion,
                    )))
                }
            }
        };

        let turn = if chess.turn() == Color::White {
            "WHITE_TO_MOVE"
        } else {
            "BLACK_TO_MOVE"
        }
        .to_string();

        let moveResult = findLegalMove(&chess, &from, &to, &promotion);

        if moveResult.is_none() {
            let payload = json!({
                "gameId":    game_id,
                "userId":    user_id,
                "move":      { "from": from, "to": to, "promotion": promotion },
                "reason":    "Illegal move according to chess rules.",
            })
            .to_string();
            let _: Result<i64, _> = conn
                .publish(format!("game:move:invalid:{game_id}"), &payload)
                .await;
            return Ok(Response::new(invalidResponse(
                "Illegal move according to chess rules.",
                &game_id,
                &user_id,
                &from,
                &to,
                &promotion,
            )));
        }

        // Apply move; derive all values before Fen::from_position consumes new_chess.
        let new_chess = chess
            .play(moveResult.as_ref().unwrap())
            .map_err(|e| Status::internal(format!("Play error: {e}")))?;

        let isGameOver_pos = new_chess.outcome().is_some();
        let isCheckmate = matches!(new_chess.outcome(), Some(Outcome::Decisive { .. }));
        let isDraw_pos = matches!(new_chess.outcome(), Some(Outcome::Draw));
        let is_insufficient = new_chess.is_insufficient_material();
        let is_fifty_move = new_chess.halfmoves() >= 100;
        let isDraw = isDraw_pos || is_insufficient || is_fifty_move;
        let isGameOver = isGameOver_pos || is_insufficient || is_fifty_move;
        let nextTurn = new_chess.turn();
        let moveNumber = new_chess.fullmoves().get();

        let newFen = Fen::from_position(new_chess, EnPassantMode::Legal).to_string();

        let currentTime = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();

        let mut black_player_left_time: f64 = gameData
            .get("black_player_left_time")
            .and_then(|s| s.parse().ok())
            .unwrap_or(300.0);
        let mut white_player_left_time: f64 = gameData
            .get("white_player_left_time")
            .and_then(|s| s.parse().ok())
            .unwrap_or(300.0);
        let lastGameMoveTime: f64 = gameData
            .get("last_move_time")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let increment: f64 = gameData
            .get("increment")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        let mut finalState = if isGameOver {
            if isCheckmate {
                "CHECKMATE".to_string()
            } else if isDraw {
                "DRAW".to_string()
            } else {
                "GAME_OVER".to_string()
            }
        } else {
            "IN_PROGRESS".to_string()
        };

        // null means no timeout winner yet; set inside the IN_PROGRESS block if clock hits 0
        let mut timeoutWinnerId: Option<String> = None;
        let mut timeoutStatus: Option<String> = None;

        let timeElapsed = if lastGameMoveTime > 0.0 {
            (currentTime - lastGameMoveTime).max(0.0)
        } else {
            0.0
        };

        let mut updates: Vec<(String, String)> = vec![
            ("current_fen".to_string(), newFen.clone()),
            ("game_state".to_string(), finalState.clone()),
        ];

        if finalState == "IN_PROGRESS" {
            updates.push(("last_move_time".to_string(), currentTime.to_string()));

            if nextTurn == Color::Black {
                // Black to move next → white just moved → deduct from white's clock
                white_player_left_time =
                    (white_player_left_time + increment - timeElapsed).max(0.0);
                updates.push((
                    "white_player_left_time".to_string(),
                    white_player_left_time.to_string(),
                ));
                if white_player_left_time == 0.0 {
                    finalState = "TIMEOUT".to_string();
                    timeoutWinnerId = gameData.get("black_player_id").cloned();
                    timeoutStatus = Some("BLACK_WIN".to_string());
                }
            } else {
                // White to move next → black just moved → deduct from black's clock
                black_player_left_time =
                    (black_player_left_time + increment - timeElapsed).max(0.0);
                updates.push((
                    "black_player_left_time".to_string(),
                    black_player_left_time.to_string(),
                ));
                if black_player_left_time == 0.0 {
                    finalState = "TIMEOUT".to_string();
                    timeoutWinnerId = gameData.get("white_player_id").cloned();
                    timeoutStatus = Some("WHITE_WIN".to_string());
                }
            }

            for (k, v) in &mut updates {
                if k == "game_state" {
                    *v = finalState.clone();
                }
            }
        }

        // ── Persist state + append move history ───────────────────────────────
        let historyKey = format!("game:moveshistory:{game_id}");
        let moveJsonStr = json!({
            "from": from, "to": to, "promotion": promotion,
            "fen_after": newFen, "san": "", "moveNumber": moveNumber,
            "time_taken": timeElapsed,
        })
        .to_string();

        {
            let mut cmd = redis::cmd("HSET");
            cmd.arg(&hashKey);
            for (k, v) in &updates {
                cmd.arg(k.as_str()).arg(v.as_str());
            }
            let _: () = cmd.query_async(&mut conn).await.unwrap_or(());
        }
        let _: String = conn
            .xadd(
                &historyKey,
                "*",
                &[("userId", user_id.as_str()), ("move", moveJsonStr.as_str())],
            )
            .await
            .unwrap_or_default();

        // ── Game-over bookkeeping ─────────────────────────────────────────────
        if finalState != "IN_PROGRESS" {
            let (winnerId, status) = if finalState == "TIMEOUT" {
                (timeoutWinnerId.clone(), timeoutStatus.unwrap_or_default())
            } else if isCheckmate {
                // after chess.move(), turn() is the checkmated player → winner is the other
                let winnerId = if nextTurn == Color::White {
                    gameData.get("black_player_id").cloned()
                } else {
                    gameData.get("white_player_id").cloned()
                };
                let status = if nextTurn == Color::White {
                    "BLACK_WIN"
                } else {
                    "WHITE_WIN"
                };
                (winnerId, status.to_string())
            } else {
                (None, "DRAW".to_string())
            };

            let _: String = conn
                .xadd(
                    "match:process:results",
                    "*",
                    &[(
                        "payload",
                        json!({ "gameId": game_id, "winnerId": winnerId, "status": status })
                            .to_string()
                            .as_str(),
                    )],
                )
                .await
                .unwrap_or_default();

            for id in [
                gameData.get("white_player_id"),
                gameData.get("black_player_id"),
            ]
            .into_iter()
            .flatten()
            {
                let mm_key = format!("matchmaking:gameId:{id}");
                let members: Vec<String> = conn.zrange(&mm_key, 0, -1).await.unwrap_or_default();
                for member in members {
                    if member == *game_id || member.starts_with(&format!("{game_id}:")) {
                        let _: () = conn.zrem(&mm_key, member).await.unwrap_or(());
                    }
                }
            }
            let _: i64 = conn.zrem("live:games", &game_id).await.unwrap_or(0);

            // Rematch context is only meaningful for casual (non-tournament) games.
            if gameData
                .get("tournament_id")
                .map(|s| s.as_str())
                .unwrap_or("")
                .is_empty()
            {
                let p1 = gameData.get("player1_id").map(|s| s.as_str()).unwrap_or("");
                let p2 = gameData.get("player2_id").map(|s| s.as_str()).unwrap_or("");
                let (smallerId, largerId) = if p1 < p2 { (p1, p2) } else { (p2, p1) };
                let key = format!("game:rematch:{smallerId}:{largerId}");

                {
                    let mut cmd = redis::cmd("HSET");
                    cmd.arg(&key)
                        .arg("player1_id")
                        .arg(gameData.get("player1_id").map(|s| s.as_str()).unwrap_or(""))
                        .arg("player1_rating")
                        .arg(
                            gameData
                                .get("player1_rating")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("player1_profile_image_url")
                        .arg(
                            gameData
                                .get("player1_profile_image_url")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("player1_username")
                        .arg(
                            gameData
                                .get("player1_username")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("player2_id")
                        .arg(gameData.get("player2_id").map(|s| s.as_str()).unwrap_or(""))
                        .arg("player2_rating")
                        .arg(
                            gameData
                                .get("player2_rating")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("player2_profile_image_url")
                        .arg(
                            gameData
                                .get("player2_profile_image_url")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("player2_username")
                        .arg(
                            gameData
                                .get("player2_username")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("white_player_id")
                        .arg(
                            gameData
                                .get("white_player_id")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("black_player_id")
                        .arg(
                            gameData
                                .get("black_player_id")
                                .map(|s| s.as_str())
                                .unwrap_or(""),
                        )
                        .arg("increment")
                        .arg(gameData.get("increment").map(|s| s.as_str()).unwrap_or(""))
                        .arg("time_slot")
                        .arg(gameData.get("time_slot").map(|s| s.as_str()).unwrap_or(""))
                        .arg("is_rated")
                        .arg(gameData.get("is_rated").map(|s| s.as_str()).unwrap_or(""));
                    let _: () = cmd.query_async(&mut conn).await.unwrap_or(());
                }
                let _: () = redis::cmd("EXPIRE")
                    .arg(&key)
                    .arg(30_i64)
                    .query_async(&mut conn)
                    .await
                    .unwrap_or(());
            }

            // Eager scheduling cleanup for tournament games.
            if gameData
                .get("tournament_id")
                .map(|s| !s.is_empty())
                .unwrap_or(false)
            {
                for uid_key in &["white_player_id", "black_player_id"] {
                    if let Some(uid) = gameData.get(*uid_key) {
                        if uid.is_empty() {
                            continue;
                        }
                        let _: i64 = conn
                            .hdel(format!("game:schedule:info:{uid}"), &game_id)
                            .await
                            .unwrap_or(0);
                        let _: i64 = conn
                            .zrem(format!("user:active:games:{uid}"), &game_id)
                            .await
                            .unwrap_or(0);
                    }
                }
            }
        }

        // ── Publish move to players ───────────────────────────────────────────
        let movePayloadStr = json!({
            "gameId":              game_id,
            "userId":              user_id,
            "move":                { "from": from, "to": to, "promotion": promotion },
            "newFen":              newFen,
            "gameStatus":          finalState,
            "blackPlayerLeftTime": black_player_left_time,
            "whitePlayerLeftTime": white_player_left_time,
            "increment":           increment,
            "turn":                if nextTurn == Color::White { "w" } else { "b" },
            "timeTakenMs":         (timeElapsed * 1000.0).round() as i64,
        })
        .to_string();

        let _: Result<i64, _> = conn
            .publish(format!("game:move:processed:{game_id}"), &movePayloadStr)
            .await;

        // ── Mirror state + publish to spectators (only when watched) ─────────
        let is_watched = self.watched_games.read().await.contains(&game_id);
        if is_watched {
            // Write the same field updates to the secondary spectate copy so
            // spectators who reconnect (or refresh) read consistent state.
            spectate::update_spectate_state(&mut conn, &game_id, &updates).await;
            let _: Result<i64, _> = conn
                .publish(format!("game:spectate:move:{game_id}"), &movePayloadStr)
                .await;
        }

        println!("[gRPC] Processed move {from}→{to} for game {game_id} ({finalState})");

        Ok(Response::new(MoveResponse {
            valid: true,
            new_fen: newFen,
            game_status: finalState,
            turn,
            is_game_over: isGameOver,
            black_player_left_time: black_player_left_time as i32,
            white_player_left_time: white_player_left_time as i32,
            error_reason: String::new(),
            game_id: game_id.clone(),
            user_id,
            move_from: from,
            move_to: to,
            move_promotion: promotion,
            game_mode: gameData
                .get("gameMode")
                .cloned()
                .unwrap_or_else(|| "standard".to_string()),
        }))
    }

    // ── RegisterSpectatedGame ─────────────────────────────────────────────────
    // Called by ws-server when the first spectator joins a game.
    // Bypasses the 10-second background poll so the game is watched immediately.
    async fn register_spectated_game(
        &self,
        request: Request<SpectateRequest>,
    ) -> Result<Response<SpectateResponse>, Status> {
        let game_id = request.into_inner().game_id;
        self.watched_games.write().await.insert(game_id.clone());

        // Atomically create game:spectate:state:{game_id} from the primary state.
        // COPY without REPLACE is a no-op if the copy already exists, so concurrent
        // RegisterSpectatedGame calls are safe — only the first one copies, the rest
        // are silently ignored.
        let mut conn = self.redis.clone();
        let created = spectate::create_spectate_state(&mut conn, &game_id).await;
        println!("[gRPC] Spectate registered for game {game_id} (copy_created={created})");
        Ok(Response::new(SpectateResponse { success: true }))
    }
}
