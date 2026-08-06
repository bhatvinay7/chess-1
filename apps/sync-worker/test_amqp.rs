use lapin::{Connection, ConnectionProperties};
use std::env;

#[tokio::main]
async fn main() {
    let url = "amqps://qprcuejr:r1HokcT6xzx3bcPxKdCkX0pSUCxVFdIK@warthog.lmq.cloudamqp.com/qprcuejr";
    println!("Connecting to AMQP...");
    match Connection::connect(url, ConnectionProperties::default()).await {
        Ok(_) => println!("Connected successfully!"),
        Err(e) => println!("Error: {}", e),
    }
}
