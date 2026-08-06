use std::collections::HashMap;
use std::sync::Arc;

use sqlx::PgPool;
use uuid::Uuid;

use super::types::{BoxError, MatchPlayer};

// ── All participants (first-round pairing pool) ───────────────────────────────

/// Fetch every registered participant with cumulative stats and full pairing history.
/// Returned pre-sorted: score DESC, rating DESC.
pub(super) async fn fetch_participants(
    db: &Arc<PgPool>,
    tournament_id: &str,
) -> Result<Vec<MatchPlayer>, BoxError> {
    let rows = sqlx::query_as::<_, (String, Uuid, String, String, i32, f64, bool, i32, i32)>(
        r#"
        SELECT
            tp.id,
            tp."playerId",
            u.username,
            COALESCE(u."profileImageUrl", ''),
            COALESCE(tp."ratingAtJoin", u.rating),
            COALESCE(ps.score,              0.0),
            COALESCE(ps."byeReceived",      false),
            COALESCE(ps."totalWhiteGames",  0),
            COALESCE(ps."totalBlackGames",  0)
        FROM "TournamentParticipant" tp
        JOIN "User" u  ON u.id = tp."playerId"
        LEFT JOIN "TournamentPlayerStats" ps ON ps."tournamentParticipantId" = tp.id
        WHERE tp."tournamentId" = $1
        ORDER BY COALESCE(ps.score, 0.0) DESC,
                 COALESCE(tp."ratingAtJoin", u.rating) DESC
        "#,
    )
    .bind(tournament_id)
    .fetch_all(&**db)
    .await?;

    if rows.is_empty() {
        return Ok(vec![]);
    }

    build_players_with_history(db, tournament_id, rows).await
}

// ── Promoted participants (next-round pairing pool) ───────────────────────────

/// Returns (promoted_player_ids, next_round_number) from the last completed round,
/// or None if no completed round exists yet.
///
/// Top-`TOP_ADVANCE` players per group are promoted by score (wins + draws×0.5);
/// ties broken by ratingAtJoin DESC.
pub(super) async fn fetch_promoted_ids(
    db: &Arc<PgPool>,
    tournament_id: &str,
    rr_advance_per_group: usize,
) -> Result<Option<(Vec<Uuid>, usize)>, BoxError> {
    // Last completed round
    let last_round: Option<(String, i32)> = sqlx::query_as::<_, (String, i32)>(
        r#"SELECT id, "roundNumber" FROM "Round"
           WHERE "tournamentId" = $1 AND status = 'COMPLETED'
           ORDER BY "roundNumber" DESC LIMIT 1"#,
    )
    .bind(tournament_id)
    .fetch_optional(&**db)
    .await?;

    let Some((last_round_id, last_round_num)) = last_round else {
        return Ok(None);
    };

    // All groups in that round
    let group_ids: Vec<String> = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "groupId" FROM "Match"
           WHERE "roundId" = $1 AND "groupId" IS NOT NULL"#,
    )
    .bind(&last_round_id)
    .fetch_all(&**db)
    .await?
    .into_iter()
    .flatten()
    .collect();

    // Top N per group by score (wins + draws×0.5), ties broken by rating.
    // Uses a subquery to deduplicate players first (a player can appear in multiple
    // game rows in RR double-headers), then outer-sorts by score DESC so LIMIT N
    // returns the genuinely highest-scoring players — not the lowest UUID values.
    let mut promoted: Vec<Uuid> = Vec::new();
    for gid in &group_ids {
        let top: Vec<Uuid> = sqlx::query_scalar::<_, Uuid>(
            r#"
            SELECT "playerId" FROM (
                SELECT DISTINCT
                    tp."playerId",
                    COALESCE(ps.score,                0.0) AS score,
                    COALESCE(tp."ratingAtJoin", u.rating)  AS rating
                FROM "Match" m
                JOIN "Game" g  ON g.id = m."gameId"::uuid
                JOIN "TournamentParticipant" tp
                    ON  tp."tournamentId" = $1
                    AND (tp."playerId" = g."whitePlayerId" OR tp."playerId" = g."blackPlayerId")
                LEFT JOIN "TournamentPlayerStats" ps ON ps."tournamentParticipantId" = tp.id
                JOIN "User" u  ON u.id = tp."playerId"
                WHERE m."groupId" = $2
                  AND g."blackPlayerId" IS NOT NULL
            ) players
            ORDER BY score DESC, rating DESC
            LIMIT $3
            "#,
        )
        .bind(tournament_id)
        .bind(gid)
        .bind(rr_advance_per_group as i64)
        .fetch_all(&**db)
        .await?;

        promoted.extend(top);
    }

    Ok(Some((promoted, (last_round_num + 1) as usize)))
}

// ── Shared helper ─────────────────────────────────────────────────────────────

/// Attach full pairing history (opponent_ids + colors_played) to a set of raw rows.
async fn build_players_with_history(
    db: &Arc<PgPool>,
    tournament_id: &str,
    rows: Vec<(String, Uuid, String, String, i32, f64, bool, i32, i32)>,
) -> Result<Vec<MatchPlayer>, BoxError> {
    let mut by_player: HashMap<Uuid, usize> = HashMap::new();
    let mut players: Vec<MatchPlayer> = rows
        .into_iter()
        .enumerate()
        .map(|(i, (pid, uid, uname, pic, rating, score, bye, tw, tb))| {
            by_player.insert(uid, i);
            MatchPlayer {
                participant_id: pid,
                player_id: uid,
                username: uname,
                profile_image: pic,
                rating,
                score,
                bye_received: bye,
                total_white: tw,
                total_black: tb,
                opponent_ids: vec![],
                colors_played: vec![],
            }
        })
        .collect();

    let history_rows = sqlx::query_as::<_, (Uuid, Option<Uuid>)>(
        r#"
        SELECT g."whitePlayerId", g."blackPlayerId"
        FROM "Match" m
        JOIN "Game" g ON g.id = m."gameId"::uuid
        WHERE m."tournamentId" = $1
          AND g."blackPlayerId" IS NOT NULL
        ORDER BY g."createdAt"
        "#,
    )
    .bind(tournament_id)
    .fetch_all(&**db)
    .await?;

    for (white_id, black_id) in history_rows {
        let Some(black_id) = black_id else {
            continue;
        };
        if let Some(&wi) = by_player.get(&white_id) {
            players[wi].opponent_ids.push(black_id);
            players[wi].colors_played.push("WHITE".to_string());
        }
        if let Some(&bi) = by_player.get(&black_id) {
            players[bi].opponent_ids.push(white_id);
            players[bi].colors_played.push("BLACK".to_string());
        }
    }

    Ok(players)
}
