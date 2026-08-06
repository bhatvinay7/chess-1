use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "AuthType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuthType {
    Credentials,
    Google,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserAuth {
    pub id: String,
    #[sqlx(rename = "userId")]
    pub user_id: Uuid,
    #[sqlx(rename = "authType")]
    pub auth_type: AuthType,
    #[sqlx(rename = "providerId")]
    pub provider_id: String,
    #[sqlx(rename = "passwordHash")]
    pub password_hash: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "RatingCategory", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RatingCategory {
    Bullet,
    Blitz,
    Rapid,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserRating {
    pub id: String,
    #[sqlx(rename = "userId")]
    pub user_id: Uuid,
    pub category: RatingCategory,
    pub rating: i32,
    pub wins: i32,
    pub losses: i32,
    pub draws: i32,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: Option<String>,
    #[sqlx(rename = "profileImageUrl")]
    pub profile_image_url: Option<String>,
    pub bio: Option<String>,
    pub password: Option<String>,
    #[sqlx(rename = "isAdmin")]
    pub is_admin: bool,
    pub rating: i32,
    pub wins: i32,
    pub losses: i32,
    pub draws: i32,
    #[sqlx(rename = "tournamentId")]
    pub tournament_id: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}
