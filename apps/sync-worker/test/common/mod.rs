use std::sync::Arc;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use bb8_redis::{RedisConnectionManager, bb8};
use sync_worker::stream_jobs::RedisPool;
use rabbitmq_rustclient::RabbitClient;

pub fn load_env() {
    dotenvy::dotenv().ok();
}

pub async fn setup_db() -> Arc<PgPool> {
    load_env();
    let db_url = std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://neondb_owner:npg_bxtPcrwmN5Z2@ep-aged-dew-aozy1uw5.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require".to_string()
    });
    
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect(&db_url)
        .await
        .expect("Failed to connect to TEST_DATABASE_URL");
        
    Arc::new(pool)
}

pub async fn setup_redis() -> RedisPool {
    let redis_url = std::env::var("TEST_REDIS_URL").unwrap_or_else(|_| {
        "rediss://default:gQAAAAAAATNtAAIgcDIzMDMyZjcxYWM3NDI0ZGNlYjEwZjg4OTExYWI1NDU2OQ@clear-orca-78701.upstash.io:6379".to_string()
    });
    
    let manager = RedisConnectionManager::new(redis_url)
        .expect("Invalid TEST_REDIS_URL");
    
    bb8::Pool::builder()
        .max_size(20)
        .build(manager)
        .await
        .expect("Failed to create Redis pool")
}

pub async fn setup_rabbitmq() -> Arc<RabbitClient> {
    let rmq_url = std::env::var("TEST_RABBITMQ_URL").unwrap_or_else(|_| {
        "mock".to_string()
    });
    
    let client = RabbitClient::new(&rmq_url)
        .await
        .expect("Failed to connect to TEST_RABBITMQ_URL");
        
    Arc::new(client)
}

pub async fn cleanup_db(db: &PgPool, tournament_id: &str) {
    let _ = sqlx::query(r#"DELETE FROM "Game" WHERE "tournamentId" = $1"#)
        .bind(tournament_id).execute(db).await;
    let _ = sqlx::query(r#"DELETE FROM "TournamentStanding" WHERE "tournamentId" = $1"#)
        .bind(tournament_id).execute(db).await;
    let _ = sqlx::query(r#"DELETE FROM "TournamentParticipant" WHERE "tournamentId" = $1"#)
        .bind(tournament_id).execute(db).await;
    let _ = sqlx::query(r#"DELETE FROM "TournamentTimeManagement" WHERE "tournamentId" = $1"#)
        .bind(tournament_id).execute(db).await;
    let _ = sqlx::query(r#"DELETE FROM "Round" WHERE "tournamentId" = $1"#)
        .bind(tournament_id).execute(db).await;
    let _ = sqlx::query(r#"DELETE FROM "Tournament" WHERE id = $1"#)
        .bind(tournament_id).execute(db).await;
}

pub async fn seed_dummy_users(db: &PgPool, count: usize) -> Vec<String> {
    let mut user_ids = Vec::new();
    for _i in 0..count {
        let user_id = uuid::Uuid::new_v4();
        let username = format!("test_user_{}", uuid::Uuid::new_v4());
        let email = format!("{}@test.com", username);
        
        sqlx::query(
            r#"INSERT INTO "User" (id, username, email, "isAdmin", rating, wins, losses, draws, "createdAt", "updatedAt")
               VALUES ($1, $2, $3, false, 1200, 0, 0, 0, NOW(), NOW())"#
        )
        .bind(user_id)
        .bind(username)
        .bind(email)
        .execute(db)
        .await
        .expect("Failed to seed user");
        
        user_ids.push(user_id.to_string());
    }
    user_ids
}

pub async fn seed_tournament(db: &PgPool, tournament_id: &str, t_type: &str, is_rated: bool) {
    let creator_id = uuid::Uuid::new_v4();
    let username = format!("creator_{}", creator_id);
    let email = format!("{}@test.com", username);

    sqlx::query(
        r#"INSERT INTO "User" (id, username, email, "isAdmin", rating, wins, losses, draws, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, false, 1200, 0, 0, 0, NOW(), NOW())"#
    )
    .bind(creator_id)
    .bind(username)
    .bind(email)
    .execute(db).await.expect("Failed to seed creator");

    // Convert string to proper enum if needed, but sqlx query handles string cast with ::"TournamentType"
    sqlx::query(
        r#"INSERT INTO "Tournament" (
            id, name, "tournamentType", "accessType", visibility, status, "isRated", "gameType", "creatorId", "createdAt", "updatedAt"
        ) VALUES (
            $1, 'Test Tournament', $2::"TournamentType", 'OPEN'::"TournamentAccessType", 'PUBLIC'::"TournamentVisibility", 'NOT_INITIALIZED'::"TournamentStatus", $3, 'STANDARD'::"GameType", $4, NOW(), NOW()
        )"#
    )
    .bind(tournament_id)
    .bind(t_type)
    .bind(is_rated)
    .bind(&creator_id)
    .execute(db)
    .await
    .expect("Failed to seed tournament");

    let ttm_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO "TournamentTimeManagement" (
            id, "tournamentId", "registrationOpenAt", "registrationCloseAt", "startTime"
        ) VALUES (
            $1, $2, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour', NOW()
        )"#
    )
    .bind(ttm_id)
    .bind(tournament_id)
    .execute(db)
    .await
    .expect("Failed to seed time management");
}

pub async fn join_tournament(db: &PgPool, tournament_id: &str, user_ids: &[String]) {
    for user_id in user_ids {
        let parsed_uuid = uuid::Uuid::parse_str(user_id).unwrap();
        let participant_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            r#"INSERT INTO "TournamentParticipant" (id, "playerId", "tournamentId", "joinedAt", role)
               VALUES ($1, $2, $3, NOW(), 'PLAYER'::"TournamentRole")"#
        )
        .bind(participant_id)
        .bind(parsed_uuid)
        .bind(tournament_id)
        .execute(db)
        .await
        .expect("Failed to add participant");
    }
}

