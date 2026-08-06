use bb8_redis::{bb8, RedisConnectionManager};
/// Idempotent creation of Redis stream consumer groups.
/// Accepts a slice of (stream_name, group_name) pairs.
use redis;

pub type RedisPool = bb8::Pool<RedisConnectionManager>;

pub async fn initialize_stream_infrastructure(
    pool: &RedisPool,
    streams: &[(&str, &str)],
) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = pool.get().await?;

    for (stream_name, group_name) in streams {
        let res: Result<(), redis::RedisError> = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(stream_name)
            .arg(group_name)
            .arg("$")
            .arg("MKSTREAM")
            .query_async(&mut *conn)
            .await;

        match res {
            Ok(_) => println!("[init] group '{group_name}' created on '{stream_name}'"),
            Err(e) if e.to_string().contains("BUSYGROUP") => {
                println!("[init] group '{group_name}' on '{stream_name}' already exists — OK")
            }
            Err(e) => return Err(Box::new(e)),
        }
    }
    Ok(())
}
