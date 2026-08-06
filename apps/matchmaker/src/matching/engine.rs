use redis_rustclient::redis::AsyncCommands;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::matching::publisher::publish_match;
use crate::matching::recovery::QUEUE_ZSET;
use crate::models::StagedPlayer;

const BASE_ELO_GAP: f64 = 50.0;
const EXPANSION_RATE: f64 = 2.0;

pub async fn run_matching_tick<C: AsyncCommands + Send>(
    mut queue: BTreeMap<(String, bool, u32, String), StagedPlayer>,
    conn: &mut C,
) -> BTreeMap<(String, bool, u32, String), StagedPlayer> {
    let mut consumed: HashSet<String> = HashSet::new();

    let all_keys: Vec<(String, bool, u32, String)> = queue.keys().cloned().collect();
    let all_uids: Vec<String> = all_keys.iter().map(|(_, _, _, uid)| uid.clone()).collect();

    // High-performance pipeline batching to check presence
    let mut pipe = redis_rustclient::redis::pipe();
    for uid in &all_uids {
        pipe.exists(format!("presence:{}", uid));
    }

    let results: Vec<bool> = pipe
        .query_async(conn)
        .await
        .unwrap_or_else(|_| vec![false; all_uids.len()]);

    let presence_map: HashMap<String, bool> = all_uids.into_iter().zip(results).collect();

    let current_ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs_f64();

    for (slot, israted, rating, uid) in &all_keys {
        if consumed.contains(uid) {
            continue;
        }

        let p1 = match queue.get(&(slot.clone(), *israted, *rating, uid.clone())) {
            Some(p) => p.clone(),
            None => continue,
        };

        let is_p1_present = *presence_map.get(uid).unwrap_or(&false);
        if !is_p1_present {
            consumed.insert(uid.clone());
            if let Some(p_to_remove) = queue.remove(&(slot.clone(), *israted, *rating, uid.clone()))
            {
                let _: () = conn
                    .zrem(QUEUE_ZSET, p_to_remove.raw_json)
                    .await
                    .unwrap_or(());
            }
            continue;
        }

        let wait_secs = current_ts - p1.timestamp;
        let allowed_gap = BASE_ELO_GAP + (wait_secs * EXPANSION_RATE);

        let lo = rating.saturating_sub(allowed_gap as u32);
        let hi = rating.saturating_add(allowed_gap as u32);

        let candidate_keys: Vec<(String, bool, u32, String)> = queue
            .range((slot.clone(), *israted, lo, String::new())..)
            .take_while(|((s, rated, r, _), _)| s == slot && rated == israted && *r <= hi)
            .filter(|((_, _, _, u), _)| u != uid && !consumed.contains(u))
            .map(|(k, _)| k.clone())
            .collect();

        for (st, r2_rated, r2, uid2) in candidate_keys {
            let p2 = match queue.get(&(st.clone(), r2_rated, r2, uid2.clone())) {
                Some(p) => p.clone(),
                None => continue,
            };

            let is_p2_present = *presence_map.get(&uid2).unwrap_or(&false);
            if !is_p2_present {
                consumed.insert(uid2.clone());
                if let Some(p2_to_remove) = queue.remove(&(st.clone(), r2_rated, r2, uid2.clone()))
                {
                    let _: () = conn
                        .zrem(QUEUE_ZSET, p2_to_remove.raw_json)
                        .await
                        .unwrap_or(());
                }
                continue;
            }

            // Match found! Publish via publisher module
            let _ = publish_match(conn, &p1, &p2, current_ts).await;

            consumed.insert(uid.clone());
            consumed.insert(uid2.clone());
            break;
        }
    }

    queue.retain(|(_, _, _, uid), _| !consumed.contains(uid));
    queue
}
