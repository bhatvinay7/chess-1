use std::fmt::Debug;
use std::future::Future;
use std::sync::Arc;

use bb8_redis::{bb8, RedisConnectionManager};
use redis::{self, Value};
use serde::de::DeserializeOwned;
use sqlx::PgPool;

pub type RedisPool = bb8::Pool<RedisConnectionManager>;

/// Consume one XREADGROUP batch from `stream_name` and call `handler` per message.
pub async fn consume_stream_jobs<T, F, Fut>(
    redis_pool: &RedisPool,
    db: Arc<PgPool>,
    worker_id: &str,
    group_name: &str,
    stream_name: &str,
    dlq_stream: &str,
    handler: F,
) -> Result<(), Box<dyn std::error::Error>>
where
    T: DeserializeOwned + Debug + Send + 'static,
    F: Fn(Arc<PgPool>, Arc<RedisPool>, T) -> Fut,
    Fut: Future<Output = Result<(), Box<dyn std::error::Error>>>,
{
    let mut conn = redis_pool.get().await?;
    let pool_arc = Arc::new(redis_pool.clone());

    // ── XREADGROUP ─────────────────────────────────────────────────────────
    let response: Value = redis::cmd("XREADGROUP")
        .arg("GROUP")
        .arg(group_name)
        .arg(worker_id)
        .arg("COUNT")
        .arg(5)
        .arg("BLOCK")
        .arg(1000)
        .arg("STREAMS")
        .arg(stream_name)
        .arg(">")
        .query_async(&mut *conn)
        .await?;

    // ── Parse nested Array response (redis 0.27 uses Array / BulkString) ──
    let Value::Array(streams) = response else {
        return Ok(());
    };
    let Some(Value::Array(stream_data)) = streams.into_iter().next() else {
        return Ok(());
    };
    let mut stream_data_iter = stream_data.into_iter();
    let _stream_key = stream_data_iter.next(); // stream name — skip
    let messages = match stream_data_iter.next() {
        Some(Value::Array(msgs)) => msgs,
        _ => return Ok(()),
    };

    for msg in messages {
        let Value::Array(msg_parts) = msg else {
            continue;
        };
        let mut parts_iter = msg_parts.into_iter();

        // message ID
        let id_str = match parts_iter.next() {
            Some(Value::BulkString(b)) => String::from_utf8_lossy(&b).into_owned(),
            _ => continue,
        };

        // flat field/value list
        let fields = match parts_iter.next() {
            Some(Value::Array(f)) => f,
            _ => continue,
        };

        // find `payload` field
        let mut payload_bytes: Option<Vec<u8>> = None;
        let mut field_iter = fields.into_iter();
        while let (Some(k), Some(v)) = (field_iter.next(), field_iter.next()) {
            if let (Value::BulkString(key), Value::BulkString(val)) = (k, v) {
                if key == b"payload" {
                    payload_bytes = Some(val);
                    break;
                }
            }
        }
        let Some(bytes) = payload_bytes else { continue };

        match serde_json::from_slice::<T>(&bytes) {
            // ── Happy path ─────────────────────────────────────────────────
            Ok(parsed) => {
                if let Err(e) = handler(db.clone(), pool_arc.clone(), parsed).await {
                    // Transient error — leave in PEL, recovery will re-deliver
                    eprintln!("[{stream_name}] handler error (PEL retain): {e}");
                    continue;
                }

                // ACK only after the handler has durably finished its DB work.
                // If the handler returns an error, the message stays pending and
                // recovery can redeliver it for idempotent duplicate handling.
                let _: i32 = redis::cmd("XACK")
                    .arg(stream_name)
                    .arg(group_name)
                    .arg(&id_str)
                    .query_async(&mut *conn)
                    .await?;

                println!("[{stream_name}] ACK {id_str}");
            }

            // ── Poison pill → DLQ ──────────────────────────────────────────
            Err(e) => {
                eprintln!(
                    "[{stream_name}] parse error: {e} | raw: {}",
                    String::from_utf8_lossy(&bytes)
                );

                let _: () = redis::cmd("XADD")
                    .arg(dlq_stream)
                    .arg("*")
                    .arg("original_stream")
                    .arg(stream_name)
                    .arg("original_id")
                    .arg(&id_str)
                    .arg("error_reason")
                    .arg(format!("JSON parse: {e}"))
                    .arg("raw_payload")
                    .arg(&bytes)
                    .query_async(&mut *conn)
                    .await?;

                let _: i32 = redis::cmd("XACK")
                    .arg(stream_name)
                    .arg(group_name)
                    .arg(&id_str)
                    .query_async(&mut *conn)
                    .await?;
            }
        }
    }

    Ok(())
}
