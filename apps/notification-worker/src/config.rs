use lettre::transport::smtp::authentication::Credentials;
use lettre::SmtpTransport;
use mongodb::{options::ClientOptions, Client as MongoClient};
use sqlx::postgres::PgPoolOptions;
use std::env;

#[derive(Clone)]
pub struct AppState {
    pub pg_pool: sqlx::PgPool,
    pub mongo_client: MongoClient,
    pub mailer: SmtpTransport,
}

pub async fn load_config_and_state() -> Result<AppState, Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();

    // 1. Setup PostgreSQL
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pg_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;
    println!("[notification-worker] Connected to PostgreSQL.");

    // 2. Setup MongoDB
    let mongo_url = env::var("MONGO_DB_URL").expect("MONGO_DB_URL must be set");
    let mut client_options = ClientOptions::parse(&mongo_url).await?;
    client_options.app_name = Some("notification-worker".to_string());
    let mongo_client = MongoClient::with_options(client_options)?;
    println!("[notification-worker] Connected to MongoDB.");

    // 3. Setup Lettre (SMTP / Gmail)
    let smtp_user = env::var("SMTP_USER").expect("SMTP_USER must be set");
    let smtp_pass = env::var("SMTP_PASS").expect("SMTP_PASS must be set");
    let smtp_host = env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
    let creds = Credentials::new(smtp_user.clone(), smtp_pass.clone());

    let mailer = SmtpTransport::relay(&smtp_host)?.credentials(creds).build();
    println!(
        "[notification-worker] Configured SMTP ({}) for {}.",
        smtp_host, smtp_user
    );

    Ok(AppState {
        pg_pool,
        mongo_client,
        mailer,
    })
}
