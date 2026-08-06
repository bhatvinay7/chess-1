use redis::aio::ConnectionManager;

/// Atomically copies `game:state:{game_id}` → `game:spectate:state:{game_id}`.
///
/// Redis COPY without REPLACE returns 1 only when the destination does not yet
/// exist, making this inherently race-condition-free: if two requests arrive
/// simultaneously only one wins; the other gets 0 (no-op) and the existing
/// copy is left intact.
///
/// Returns true if a new copy was created, false if it already existed.
pub async fn create_spectate_state(conn: &mut ConnectionManager, game_id: &str) -> bool {
    let src = format!("game:state:{game_id}");
    let dst = format!("game:spectate:state:{game_id}");
    let created: i64 = redis::cmd("COPY")
        .arg(&src)
        .arg(&dst)
        .query_async(conn)
        .await
        .unwrap_or(0);
    created == 1
}

/// Mirrors the same field-value `updates` that were already written to
/// `game:state:{game_id}` into the secondary copy `game:spectate:state:{game_id}`.
///
/// Called inside process_move whenever the game is in the watched set.
/// Only issues the HSET if `updates` is non-empty and the spectate key exists.
pub async fn update_spectate_state(
    conn: &mut ConnectionManager,
    game_id: &str,
    updates: &[(String, String)],
) {
    if updates.is_empty() {
        return;
    }
    let key = format!("game:spectate:state:{game_id}");
    let mut cmd = redis::cmd("HSET");
    cmd.arg(&key);
    for (k, v) in updates {
        cmd.arg(k.as_str()).arg(v.as_str());
    }
    let _: () = cmd.query_async(conn).await.unwrap_or(());
}
