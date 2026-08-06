use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Clone)]
pub struct DbClient {
    pub pool: PgPool,
}

impl DbClient {
    pub async fn new(url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(url)
            .await?;
        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}
