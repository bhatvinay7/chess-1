use crate::types::{MatchNotificationEvent, TournamentMatchingDlqEvent};
use lapin::{
    options::*, types::FieldTable, BasicProperties, Channel, Connection, ConnectionProperties,
};
use std::sync::Arc;
use tokio::sync::Mutex;

pub const APP_NOTIFICATION_QUEUE: &str = "app_notification";
pub const SCHEDULAR_NOTIFICATION_QUEUE: &str = "schedular_notification";
pub const TOURNAMENT_MATCHING_DLQ: &str = "tournament_matching_dlq";

#[derive(Clone)]
pub struct RabbitClient {
    channel: Option<Arc<Mutex<Channel>>>,
}

impl RabbitClient {
    /// Create a new RabbitMQ client, connecting to the given URL.
    /// If the URL is "mock", returns a mock client that does nothing.
    pub async fn new(url: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        if url == "mock" {
            return Ok(Self { channel: None });
        }

        let mut retries = 0;
        let mut delay = std::time::Duration::from_secs(1);
        let conn = loop {
            match Connection::connect(url, ConnectionProperties::default()).await {
                Ok(c) => break c,
                Err(e) => {
                    if retries >= 10 {
                        return Err(e.into());
                    }
                    println!(
                        "[rabbitmq] Connection failed ({}), retrying in {}s...",
                        e,
                        delay.as_secs()
                    );
                    tokio::time::sleep(delay).await;
                    delay = std::cmp::min(delay * 2, std::time::Duration::from_secs(30));
                    retries += 1;
                }
            }
        };
        let channel = conn.create_channel().await?;

        // Declare the queues to ensure they exist
        channel
            .queue_declare(
                APP_NOTIFICATION_QUEUE,
                QueueDeclareOptions::default(),
                FieldTable::default(),
            )
            .await?;

        channel
            .queue_declare(
                SCHEDULAR_NOTIFICATION_QUEUE,
                QueueDeclareOptions::default(),
                FieldTable::default(),
            )
            .await?;

        channel
            .queue_declare(
                TOURNAMENT_MATCHING_DLQ,
                QueueDeclareOptions::default(),
                FieldTable::default(),
            )
            .await?;

        Ok(Self {
            channel: Some(Arc::new(Mutex::new(channel))),
        })
    }

    /// Publish a match created event to the notification queues
    pub async fn publish_match_created(
        &self,
        event: &MatchNotificationEvent,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let payload = serde_json::to_vec(event)?;

        if let Some(channel_mutex) = &self.channel {
            let channel = channel_mutex.lock().await;

            channel
                .basic_publish(
                    "",
                    APP_NOTIFICATION_QUEUE,
                    BasicPublishOptions::default(),
                    &payload,
                    BasicProperties::default(),
                )
                .await?;

            channel
                .basic_publish(
                    "",
                    SCHEDULAR_NOTIFICATION_QUEUE,
                    BasicPublishOptions::default(),
                    &payload,
                    BasicProperties::default(),
                )
                .await?;
        } else {
            println!("[MOCK RABBITMQ] Simulated sending email notification for Match {} (White: {}, Black: {})", event.match_id, event.white_player_id, event.black_player_id);
        }

        Ok(())
    }

    /// Publish a failed tournament matching job to the DLQ
    pub async fn publish_dlq(
        &self,
        event: &TournamentMatchingDlqEvent,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let payload = serde_json::to_vec(event)?;

        if let Some(channel_mutex) = &self.channel {
            let channel = channel_mutex.lock().await;

            channel
                .basic_publish(
                    "",
                    TOURNAMENT_MATCHING_DLQ,
                    BasicPublishOptions::default(),
                    &payload,
                    BasicProperties::default(),
                )
                .await?;
        }

        Ok(())
    }
}
