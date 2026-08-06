use mongodb::{
    bson::{doc, DateTime as BsonDateTime},
    Client as MongoClient,
};
use rabbitmq_rustclient::types::MatchNotificationEvent;
use serde_json::Value;

pub struct UserData {
    pub email: Option<String>,
    pub username: String,
}

pub struct TournamentData {
    pub game_type: String,
    pub time_control_id: Option<String>,
}

pub async fn get_user_data(
    pool: &sqlx::PgPool,
    user_id: &str,
) -> Result<Option<UserData>, Box<dyn std::error::Error + Send + Sync>> {
    let uuid_val = match uuid::Uuid::parse_str(user_id) {
        Ok(u) => u,
        Err(_) => return Ok(None),
    };

    let row: Option<(Option<String>, String)> =
        sqlx::query_as(r#"SELECT email, username FROM "User" WHERE id = $1"#)
            .bind(uuid_val)
            .fetch_optional(pool)
            .await?;

    if let Some((email, username)) = row {
        Ok(Some(UserData { email, username }))
    } else {
        Ok(None)
    }
}

pub async fn get_tournament_data(
    pool: &sqlx::PgPool,
    tournament_id: &str,
) -> Result<Option<TournamentData>, Box<dyn std::error::Error + Send + Sync>> {
    let row: Option<(String, Option<String>)> = sqlx::query_as(
        r#"SELECT "gameType"::text, "timeControlId" FROM "Tournament" WHERE id = $1"#,
    )
    .bind(tournament_id)
    .fetch_optional(pool)
    .await?;

    if let Some((game_type, time_control_id)) = row {
        Ok(Some(TournamentData {
            game_type,
            time_control_id,
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_time_control_display(
    pool: &sqlx::PgPool,
    time_control_id: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let row: Option<(String,)> =
        sqlx::query_as(r#"SELECT "displayName" FROM "TimeControl" WHERE id = $1"#)
            .bind(time_control_id)
            .fetch_optional(pool)
            .await?;

    if let Some((display_name,)) = row {
        Ok(display_name)
    } else {
        Ok("Unknown".to_string())
    }
}

pub async fn save_notification_to_mongo(
    client: &MongoClient,
    user_id: &str,
    notif_type: &str,
    message: &str,
    event: &MatchNotificationEvent,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let db = client.database("test");
    let coll = db.collection::<mongodb::bson::Document>("Notification");

    let metadata = match serde_json::to_value(event)? {
        Value::Object(map) => {
            let bson_val = mongodb::bson::to_bson(&map)?;
            if let mongodb::bson::Bson::Document(doc) = bson_val {
                Some(doc)
            } else {
                None
            }
        }
        _ => None,
    };

    let doc = doc! {
        "userId": user_id,
        "type": notif_type,
        "message": message,
        "metadata": metadata,
        "isRead": false,
        "createdAt": BsonDateTime::now()
    };

    coll.insert_one(doc, None).await?;
    println!(
        "[notification-worker] Inserted MongoDB notification for user {}",
        user_id
    );

    Ok(())
}
