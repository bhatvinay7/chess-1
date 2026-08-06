mod common;

use uuid::Uuid;
use sqlx::Row;
use sync_worker::handlers::tournament_init::{run_tournament_init, run_next_round};

#[tokio::test]
async fn test_swiss_tournament_e2e() {
    // 1. Setup connections
    let db = common::setup_db().await;
    let redis = common::setup_redis().await;
    let rabbitmq = common::setup_rabbitmq().await;
    
    // 2. Setup Data
    let tournament_id = Uuid::new_v4();
    common::seed_tournament(&db, &tournament_id.to_string(), "GLOBAL_SWISS", false).await;
    
    let user_ids = common::seed_dummy_users(&db, 10).await;
    common::join_tournament(&db, &tournament_id.to_string(), &user_ids).await;
    
    // 3. Test Init
    let init_result = run_tournament_init(&db, &redis, &rabbitmq, &tournament_id.to_string()).await;
    assert!(init_result.is_ok(), "Tournament initialization failed: {:?}", init_result.err());
    
    // Verify it changed to IN_PROGRESS
    let status: String = sqlx::query_scalar(
        r#"SELECT status::text FROM "Tournament" WHERE id = $1"#
    ).bind(tournament_id.to_string()).fetch_one(&*db).await.unwrap();
    assert_eq!(status, "IN_PROGRESS");
    
    // Check rounds created
    let rounds = sqlx::query(
        r#"SELECT id FROM "Round" WHERE "tournamentId" = $1"#
    ).bind(tournament_id.to_string()).fetch_all(&*db).await.unwrap();
    assert_eq!(rounds.len(), 1, "First round should be created");
    
    // 4. Simulate round completions
    let games = sqlx::query(
        r#"SELECT id, "whitePlayerId" FROM "Game" WHERE "tournamentId" = $1"#
    ).bind(tournament_id.to_string()).fetch_all(&*db).await.unwrap();
    
    for game in games {
        let game_id: Uuid = game.get("id");
        let white_id: Uuid = game.get("whitePlayerId");
        sqlx::query(
            r#"UPDATE "Game" SET status = 'WHITE_WIN', "winnerId" = $1 WHERE id = $2"#
        )
        .bind(white_id)
        .bind(game_id)
        .execute(&*db).await.unwrap();
    }
    
    // Mark round as completed
    sqlx::query(r#"UPDATE "Round" SET status = 'COMPLETED' WHERE "tournamentId" = $1"#)
        .bind(tournament_id.to_string()).execute(&*db).await.unwrap();
    
    // 5. Test next round
    let next_round_result = run_next_round(&db, &redis, &rabbitmq, &tournament_id.to_string()).await;
    assert!(next_round_result.is_ok(), "Next round transition failed");
    
    // Check next round
    let rounds_after = sqlx::query(
        r#"SELECT id FROM "Round" WHERE "tournamentId" = $1"#
    ).bind(tournament_id.to_string()).fetch_all(&*db).await.unwrap();
    assert_eq!(rounds_after.len(), 2, "Second round should be created");
    
    // Cleanup
    common::cleanup_db(&db, &tournament_id.to_string()).await;
}
