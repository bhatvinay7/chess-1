use std::sync::Arc;

use sqlx::PgPool;
use uuid::Uuid;

use crate::stream_jobs::RedisPool;
use crate::types::MatchData;

pub async fn handle_matchmaking(
    db: Arc<PgPool>,
    _redis: Arc<RedisPool>,
    data: MatchData,
) -> Result<(), Box<dyn std::error::Error>> {
    let white_player_id = Uuid::parse_str(&data.p1.user_id)?;
    let black_player_id = Uuid::parse_str(&data.p2.user_id)?;
    let game_id = Uuid::parse_str(&data.game_id)?;

    if white_player_id == black_player_id {
        return Err("Players must have different user IDs".into());
    }

    // Verify both players exist before the INSERT. A missing player means a stale
    // matchmaking message (e.g. DB was reset while Redis still had old entries).
    // Return Ok to ACK and drain it — returning Err would loop forever in PEL.
    let found: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "User" WHERE id = $1 OR id = $2"#)
        .bind(white_player_id)
        .bind(black_player_id)
        .fetch_one(&*db)
        .await?;
    println!("{:?}", found);
    if found < 2 {
        eprintln!(
            "[matchmaking] Skipping game {game_id}: {found}/2 players found in DB \
             (white={white_player_id}, black={black_player_id}) — ACKing stale message"
        );
        return Ok(());
    }

    println!("[matchmaking] Game {} matched, delaying DB insert until completion.", game_id);
    Ok(())
}
