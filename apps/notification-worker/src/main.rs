mod config;
mod consumer;
mod db;
mod email;

use futures_lite::stream::StreamExt;
use lapin::{options::*, types::FieldTable, Connection, ConnectionProperties};
use std::env;
use std::sync::Arc;

use config::load_config_and_state;
use consumer::process_message;
use rabbitmq_rustclient::client::APP_NOTIFICATION_QUEUE;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    println!("[notification-worker] Starting...");

    metrics_rustclient::system::start_system_metrics_collector(5);
    let metrics = Arc::new(metrics_rustclient::MetricsCollector::new(
        "notification-worker",
    ));
    let metrics_port: u16 = env::var("METRICS_PORT")
        .unwrap_or_else(|_| "9104".to_string())
        .parse()
        .unwrap_or(9104);
    metrics_rustclient::server::start_metrics_server(metrics.clone(), metrics_port);

    // 1. Setup config and state
    let state = Arc::new(load_config_and_state().await?);

    // 2. Setup RabbitMQ
    let rabbitmq_url =
        env::var("RABBITMQ_URL").unwrap_or_else(|_| "amqp://127.0.0.1:5672/%2f".to_string());
    let mut retries = 0;
    let mut delay = std::time::Duration::from_secs(1);
    let conn = loop {
        match Connection::connect(&rabbitmq_url, ConnectionProperties::default()).await {
            Ok(c) => break c,
            Err(e) => {
                if retries >= 10 {
                    return Err(e.into());
                }
                println!(
                    "[notification-worker] RabbitMQ connection failed ({}), retrying in {}s...",
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

    // Ensure queue exists
    channel
        .queue_declare(
            APP_NOTIFICATION_QUEUE,
            QueueDeclareOptions::default(),
            FieldTable::default(),
        )
        .await?;

    let mut rabbit_consumer = channel
        .basic_consume(
            APP_NOTIFICATION_QUEUE,
            "notification_worker_tag",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    println!(
        "[notification-worker] Waiting for messages on {}...",
        APP_NOTIFICATION_QUEUE
    );

    // 3. Consume Loop
    while let Some(delivery) = rabbit_consumer.next().await {
        if let Ok(delivery) = delivery {
            let state = state.clone();
            let task_metrics = metrics.clone();

            // Process in a spawned task so we can handle them concurrently
            tokio::spawn(async move {
                match process_message(&state, &delivery.data).await {
                    Ok(_) => {
                        task_metrics.record_request("notification", "success", 0.0);
                        let _ = delivery.ack(BasicAckOptions::default()).await;
                        println!("[notification-worker] Processed and ACKed message.");
                    }
                    Err(e) => {
                        task_metrics.record_request("notification", "error", 0.0);
                        eprintln!("[notification-worker] Error processing message: {e}");
                        // For transient errors, you might want to nack. Here we just reject.
                        let _ = delivery.nack(BasicNackOptions::default()).await;
                    }
                }
            });
        }
    }

    Ok(())
}
