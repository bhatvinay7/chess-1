pub mod client;
pub mod models;

pub use client::DbClient;
pub use sqlx::Error as DbError;
pub use sqlx::PgPool;

use std::sync::OnceLock;

pub fn default_url() -> &'static str {
    static DB_URL: OnceLock<String> = OnceLock::new();

    DB_URL.get_or_init(|| {
        std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/chess".to_string())
    })
}
