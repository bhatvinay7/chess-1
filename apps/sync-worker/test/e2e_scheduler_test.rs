mod common;

use uuid::Uuid;
use sqlx::Row;
use sync_worker::tournament_consumer;
use sync_worker::tournament_keys::PENDING_ZSET;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::test]
async fn test_scheduler_round_robin_progression() {
    println!("=== Round Robin Progression Test ===");
    let db = common::setup_db().await;
    let redis_pool = common::setup_redis().await;
    let rabbitmq = common::setup_rabbitmq().await;

    let tournament_id = Uuid::new_v4().to_string();
    common::seed_tournament(&db, &tournament_id, "GLOBAL_ROUND_ROBIN", false).await;
    
    // 5 players -> 1 group of 5 (Wait, what is BASE_RR_GROUP_SIZE? It's 10. So they form 1 group).
    let user_ids = common::seed_dummy_users(&db, 5).await;
    common::join_tournament(&db, &tournament_id, &user_ids).await;

    let mut conn = redis_pool.get().await.unwrap();
    // Clear locks and streams to prevent cross-test interference
    let _: () = redis::cmd("DEL").arg("lock:tournament:scheduler").arg("lock:tournament:watchdog").arg(PENDING_ZSET).query_async(&mut *conn).await.unwrap_or(());

    // Trigger Init via Scheduler
    let now_ms = chrono::Utc::now().timestamp_millis() as u64;
    let jid = format!("t:{}:init", tournament_id);
    let job_key = format!("tournament:job:{}", jid);
    let job_data = serde_json::json!({
        "tournamentId": tournament_id,
        "trigger": "init"
    }).to_string();
    
    let mut conn = redis_pool.get().await.unwrap();
    let _: () = redis::cmd("HSET").arg(&job_key).arg("data").arg(job_data).query_async(&mut *conn).await.unwrap();
    let _: () = redis::cmd("ZADD").arg(PENDING_ZSET).arg(now_ms).arg(&jid).query_async(&mut *conn).await.unwrap();

    let worker_id = "test-worker-rr".to_string();
    let db_clone = db.clone();
    let rabbitmq_clone = rabbitmq.clone();
    let pool_clone = redis_pool.clone();
    tokio::spawn(async move { tournament_consumer::run(pool_clone, db_clone, rabbitmq_clone, worker_id).await; });

    let mut status = String::new();
    for _ in 0..40 {
        sleep(Duration::from_secs(1)).await;
        status = sqlx::query_scalar(r#"SELECT status::text FROM "Tournament" WHERE id = $1"#)
            .bind(&tournament_id).fetch_one(&*db).await.unwrap();
        if status == "IN_PROGRESS" { break; }
    }
    assert_eq!(status, "IN_PROGRESS", "Round Robin Tournament did not start");

    // Wait for Round 1 to be generated
    sleep(Duration::from_secs(2)).await;

    // Complete all games for all group rounds (Round Robin max n-1 rounds for group).
    // For 5 players, n_even = 6. So 5 group rounds.
    for round_idx in 1..=5 {
        println!("Simulating Round {}", round_idx);
        
        let mut games = vec![];
        for _ in 0..40 {
            games = sqlx::query(r#"
                SELECT g.id, g."whitePlayerId" 
                FROM "Game" g
                JOIN "Match" m ON m."gameId" = g.id
                JOIN "Round" r ON r.id = m."roundId"
                WHERE g."tournamentId" = $1 
                  AND g.status = 'WAITING'
                  AND r."roundNumber" = $2
            "#)
            .bind(&tournament_id)
            .bind(round_idx)
            .fetch_all(&*db).await.unwrap();
            
            if !games.is_empty() { break; }
            sleep(Duration::from_secs(1)).await;
        }
        
        for game in games {
            let game_id: Uuid = game.get("id");
            let white_id: Uuid = game.get("whitePlayerId");
            sqlx::query(r#"UPDATE "Game" SET status = 'WHITE_WIN', "winnerId" = $1 WHERE id = $2"#)
                .bind(white_id).bind(game_id).execute(&*db).await.unwrap();
        }

        // Mark specific round as completed
        sqlx::query(r#"UPDATE "Round" SET status = 'COMPLETED' WHERE "tournamentId" = $1 AND "roundNumber" = $2"#)
            .bind(&tournament_id).bind(round_idx).execute(&*db).await.unwrap();

        // Trigger next round
        let next_jid = format!("t:{}:next_round", tournament_id);
        let next_job_key = format!("tournament:job:{}", next_jid);
        let next_job_data = serde_json::json!({
            "tournamentId": tournament_id,
            "trigger": "next_round"
        }).to_string();
        
        let now_ms = chrono::Utc::now().timestamp_millis() as u64;
        let _: () = redis::cmd("HSET").arg(&next_job_key).arg("data").arg(next_job_data).query_async(&mut *conn).await.unwrap();
        let _: () = redis::cmd("ZADD").arg(PENDING_ZSET).arg(now_ms).arg(&next_jid).query_async(&mut *conn).await.unwrap();
        
        sleep(Duration::from_secs(2)).await;
    }
    
    // After 5 group rounds for 5 players in 1 group, the tournament should be COMPLETED.
    println!("Checking if tournament completed");
    let mut status = String::new();
    for _ in 0..40 {
        sleep(Duration::from_secs(1)).await;
        status = sqlx::query_scalar(r#"SELECT status::text FROM "Tournament" WHERE id = $1"#)
            .bind(&tournament_id).fetch_one(&*db).await.unwrap();
        if status == "COMPLETED" { break; }
    }
    
    assert_eq!(status, "COMPLETED", "Tournament should complete after all group rounds");

    common::cleanup_db(&db, &tournament_id).await;
}

#[tokio::test]
async fn test_scheduler_swiss_history() {
    println!("=== Swiss History Test ===");
    let db = common::setup_db().await;
    let redis_pool = common::setup_redis().await;
    let rabbitmq = common::setup_rabbitmq().await;

    let tournament_id = Uuid::new_v4().to_string();
    common::seed_tournament(&db, &tournament_id, "GLOBAL_SWISS", false).await;
    
    let user_ids = common::seed_dummy_users(&db, 4).await;
    common::join_tournament(&db, &tournament_id, &user_ids).await;

    let mut conn = redis_pool.get().await.unwrap();
    // Clear locks and streams to prevent cross-test interference
    let _: () = redis::cmd("DEL").arg("lock:tournament:scheduler").arg("lock:tournament:watchdog").arg(PENDING_ZSET).query_async(&mut *conn).await.unwrap_or(());

    let now_ms = chrono::Utc::now().timestamp_millis() as u64;
    let jid = format!("t:{}:init", tournament_id);
    let job_key = format!("tournament:job:{}", jid);
    let job_data = serde_json::json!({
        "tournamentId": tournament_id,
        "trigger": "init"
    }).to_string();
    let _: () = redis::cmd("HSET").arg(&job_key).arg("data").arg(job_data).query_async(&mut *conn).await.unwrap();
    let _: () = redis::cmd("ZADD").arg(PENDING_ZSET).arg(now_ms).arg(&jid).query_async(&mut *conn).await.unwrap();

    let worker_id = "test-worker-swiss".to_string();
    let db_clone = db.clone();
    let rabbitmq_clone = rabbitmq.clone();
    let pool_clone = redis_pool.clone();
    tokio::spawn(async move { tournament_consumer::run(pool_clone, db_clone, rabbitmq_clone, worker_id).await; });

    let mut status = String::new();
    for _ in 0..40 {
        sleep(Duration::from_secs(1)).await;
        status = sqlx::query_scalar(r#"SELECT status::text FROM "Tournament" WHERE id = $1"#)
            .bind(&tournament_id).fetch_one(&*db).await.unwrap();
        if status == "IN_PROGRESS" { break; }
    }
    assert_eq!(status, "IN_PROGRESS", "Swiss Tournament did not start");

    sleep(Duration::from_secs(2)).await;
    
    // Verify Redis history is set for Round 1
    let games = sqlx::query(r#"SELECT id, "whitePlayerId", "blackPlayerId" FROM "Game" WHERE "tournamentId" = $1 AND status = 'WAITING'"#)
        .bind(&tournament_id).fetch_all(&*db).await.unwrap();
    
    for game in &games {
        let w: Uuid = game.get("whitePlayerId");
        let b: Uuid = game.get("blackPlayerId");
        
        let history_key = format!("tournament:{}:played", tournament_id);
        let pair1 = format!("{}:{}", w.to_string(), b.to_string());
        let pair2 = format!("{}:{}", b.to_string(), w.to_string());
        
        let is_member1: bool = redis::cmd("SISMEMBER").arg(&history_key).arg(&pair1).query_async(&mut *conn).await.unwrap();
        let is_member2: bool = redis::cmd("SISMEMBER").arg(&history_key).arg(&pair2).query_async(&mut *conn).await.unwrap();
        
        assert!(is_member1 || is_member2, "Match history was not stored in Redis");
    }

    common::cleanup_db(&db, &tournament_id).await;
}
