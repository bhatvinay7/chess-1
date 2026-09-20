use redis_rustclient::redis::aio::ConnectionLike;
use uuid::Uuid;

use crate::chess960;
use crate::matching::recovery::QUEUE_ZSET;
use crate::models::{MatchData, Player, StagedPlayer};

#[tracing::instrument(skip_all, fields(otel.kind = "producer", messaging.system = "redis"), err)]
pub async fn publish_match<C: ConnectionLike + Send>(
    conn: &mut C,
    p1: &StagedPlayer,
    p2: &StagedPlayer,
    current_ts: f64,
) -> Result<MatchData, redis_rustclient::redis::RedisError> {
    let span = tracing::Span::current();
    chess_telemetry::set_span_parent(&span, &p1.parsed.trace_context);
    chess_telemetry::add_span_link(&span, &p2.parsed.trace_context);
    let game_id = Uuid::new_v4().to_string();

    let starting_fen = if p1.parsed.game_mode == "chess960" {
        chess960::random_fen()
    } else {
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string()
    };

    let match_payload = MatchData {
        p1: Player {
            user_id: p1.parsed.user_id.clone(),
            profile_image_url: p1.parsed.profile_image_url.clone(),
            rating: p1.parsed.rating,
            username: p1.parsed.username.clone(),
        },
        p2: Player {
            user_id: p2.parsed.user_id.clone(),
            profile_image_url: p2.parsed.profile_image_url.clone(),
            rating: p2.parsed.rating,
            username: p2.parsed.username.clone(),
        },
        game_id: game_id.clone(),
        time_slot: p2.parsed.time_slot.clone(),
        is_rated: p1.parsed.is_rated,
        game_mode: p1.parsed.game_mode.clone(),
        starting_fen: starting_fen.clone(),
    };

    let match_json_str = serde_json::to_string(&chess_telemetry::with_trace_payload(
        serde_json::to_value(&match_payload).expect("serializable match"),
    ))
    .expect("Failed to serialize matchmaking payload to JSON");

    let parts_array: [u32; 2] = p1
        .parsed
        .time_slot
        .split('+')
        .map(|s| s.parse::<u32>().unwrap_or(0))
        .collect::<Vec<u32>>()
        .try_into()
        .unwrap_or([0, 0]);

    let t_slot = parts_array[0] * 60;
    let increment = parts_array[1];
    let game_slot = p1.parsed.time_slot.clone();
    let game_key = format!("game:state:{}", game_id);

    let match_zrem_items = vec![p1.raw_json.clone(), p2.raw_json.clone()];
    let p1_game_key = format!("matchmaking:gameId:{}", match_payload.p1.user_id);
    let p2_game_key = format!("matchmaking:gameId:{}", match_payload.p2.user_id);

    let start_ms = (current_ts * 1000.0) as u64;
    let duration_ms = ((parts_array[0] * 60 * 2) + (15 * 60)) as u64 * 1000;
    let end_ms = start_ms + duration_ms;
    let zset_val = format!("{}:{}", match_payload.game_id, start_ms);

    let mut pipe = redis_rustclient::redis::pipe();
    pipe.atomic();

    let hset_data = vec![
        ("player1_id", match_payload.p1.user_id.clone()),
        ("player1_rating", match_payload.p1.rating.to_string()),
        (
            "player1_profile_image_url",
            match_payload.p1.profile_image_url.clone(),
        ),
        ("black_player_left_time", t_slot.to_string()),
        ("player1_username", match_payload.p1.username.clone()),
        ("player2_username", match_payload.p2.username.clone()),
        ("increment", increment.to_string()),
        ("player2_id", match_payload.p2.user_id.clone()),
        ("player2_rating", match_payload.p2.rating.to_string()),
        (
            "player2_profile_image_url",
            match_payload.p2.profile_image_url.clone(),
        ),
        ("white_player_left_time", t_slot.to_string()),
        ("white_player_id", match_payload.p1.user_id.clone()),
        ("black_player_id", match_payload.p2.user_id.clone()),
        ("initial_fen", starting_fen.to_string()),
        ("current_fen", starting_fen.to_string()),
        ("is_rated", p1.parsed.is_rated.to_string()),
        ("gameMode", p1.parsed.game_mode.clone()),
        ("time_slot", game_slot.clone()),
        ("last_move_time", current_ts.to_string()),
        ("winner_id", "".to_string()),
        ("game_state", "INITIALIZED".to_string()),
        ("tournament_id", "".to_string()),
        ("tournament_type", "".to_string()),
        ("round_id", "".to_string()),
        ("group_id", "".to_string()),
        ("match_id", "".to_string()),
        ("left_game_start_time", "".to_string()),
        ("paired_game_id", "".to_string()),
    ];

    pipe.hset_multiple(&game_key, &hset_data);
    pipe.zadd(&p1_game_key, &zset_val, end_ms);
    pipe.zadd(&p2_game_key, &zset_val, end_ms);
    pipe.xadd("matchmaking:queue", "*", &[("payload", &match_json_str)]);
    pipe.publish("game:matchmaking:started", &match_json_str);
    pipe.publish("game:created", &match_payload.game_id);

    if !match_zrem_items.is_empty() {
        pipe.zrem(QUEUE_ZSET, match_zrem_items);
    }

    match pipe
        .query_async::<redis_rustclient::redis::Value>(conn)
        .await
    {
        Ok(_) => {
            println!("[PIPELINE SUCCESS] Match successfully committed in 1 round-trip!");
            Ok(match_payload)
        }
        Err(e) => {
            eprintln!("[REDIS ERROR] Matchmaking pipeline failed: {:?}", e);
            Err(e)
        }
    }
}
