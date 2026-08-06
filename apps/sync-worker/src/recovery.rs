use bb8_redis::{bb8, RedisConnectionManager};
/// Parameterized PEL recovery using an atomic Lua script.
/// All stream/group/lock names are injected — zero hardcoded constants.
use redis::{self, Value};

pub type RedisPool = bb8::Pool<RedisConnectionManager>;

/// Scan the PEL and either XCLAIM or DLQ entries that are stuck.
/// Returns `(lock_acquired, claimed_count, dlq_count)`.
pub async fn recover_stream(
    pool: &RedisPool,
    worker_id: &str,
    lock_key: &str,
    stream_name: &str,
    group_name: &str,
    dlq_stream: &str,
) -> Result<(i32, i32, i32), Box<dyn std::error::Error>> {
    let mut conn = pool.get().await?;

    let lua_script = r#"
        if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', 5000) then
            local claimed   = 0
            local dlq_count = 0
            local pel = redis.call('XPENDING', KEYS[2], KEYS[3], 'IDLE', 30000, '-', '+', 10)
            if pel and #pel > 0 then
                for _, entry in ipairs(pel) do
                    local msg_id         = entry[1]
                    local delivery_count = tonumber(entry[4])
                    if delivery_count > 3 then
                        local msg = redis.call('XRANGE', KEYS[2], msg_id, msg_id)
                        if msg and #msg > 0 and msg[1] and msg[1][2] then
                            redis.call('XADD', KEYS[4], '*',
                                'original_stream', KEYS[2],
                                'original_id',     msg_id,
                                'delivery_count',  tostring(delivery_count),
                                'payload',         msg[1][2][2])
                        end
                        redis.call('XACK', KEYS[2], KEYS[3], msg_id)
                        dlq_count = dlq_count + 1
                    else
                        redis.call('XCLAIM', KEYS[2], KEYS[3], ARGV[1], 30000, msg_id)
                        claimed = claimed + 1
                    end
                end
            end
            return {1, claimed, dlq_count}
        else
            return {0, 0, 0}
        end
    "#;

    let result: Value = redis::cmd("EVAL")
        .arg(lua_script)
        .arg(4)
        .arg(lock_key)
        .arg(stream_name)
        .arg(group_name)
        .arg(dlq_stream)
        .arg(worker_id)
        .query_async(&mut *conn)
        .await?;

    // redis 0.27: arrays come back as Value::Array, integers as Value::Int
    if let Value::Array(items) = result {
        if items.len() == 3 {
            let to_i32 = |v: &Value| match v {
                Value::Int(n) => *n as i32,
                _ => 0,
            };
            return Ok((to_i32(&items[0]), to_i32(&items[1]), to_i32(&items[2])));
        }
    }
    Ok((0, 0, 0))
}
