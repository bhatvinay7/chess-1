use std::sync::Arc;
use uuid::Uuid;
use sync_worker::handlers::matchmaking::handle_matchmaking;
use sync_worker::types::{MatchData, Player};

mod common;

#[tokio::test]
async fn test_matchmaking_processor() {
    let db = common::setup_db().await;
    let redis = common::setup_redis().await;
    
    // 1. Seed two dummy users in Postgres
    let users = common::seed_dummy_users(&db, 2).await;
    let u1 = &users[0];
    let u2 = &users[1];

    let game_id = Uuid::new_v4().to_string();

    // 2. Create the mock MatchData payload that Matchmaker would emit
    let payload = MatchData {
        p1: Player {
            user_id: u1.clone(),
            profile_image_url: "".into(),
            rating: 1200,
            username: "Player1".into(),
        },
        p2: Player {
            user_id: u2.clone(),
            profile_image_url: "".into(),
            rating: 1250,
            username: "Player2".into(),
        },
        game_id: game_id.clone(),
        time_slot: "3+2".into(),
        is_rated: true,
        game_mode: "standard".into(),
        starting_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".into(),
    };

    // 3. Process the matchmaking payload
    let result = handle_matchmaking(db.clone(), Arc::new(redis), payload).await;
    assert!(result.is_ok(), "Handler should succeed");

    // 4. Verify the Game was inserted into Postgres correctly
    let count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Game" WHERE id = $1 AND "whitePlayerId" = $2 AND "blackPlayerId" = $3"#
    )
    .bind(Uuid::parse_str(&game_id).unwrap())
    .bind(Uuid::parse_str(&u1).unwrap())
    .bind(Uuid::parse_str(&u2).unwrap())
    .fetch_one(&*db)
    .await
    .expect("Failed to query DB");

    assert_eq!(count, 1, "Game was not properly inserted into Postgres!");

    // Clean up
    let _ = sqlx::query(r#"DELETE FROM "Game" WHERE id = $1"#)
        .bind(Uuid::parse_str(&game_id).unwrap())
        .execute(&*db)
        .await;
    
    let _ = sqlx::query(r#"DELETE FROM "User" WHERE id = $1 OR id = $2"#)
        .bind(Uuid::parse_str(&u1).unwrap())
        .bind(Uuid::parse_str(&u2).unwrap())
        .execute(&*db)
        .await;
}
