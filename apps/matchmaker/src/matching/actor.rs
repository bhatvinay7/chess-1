use actix::prelude::*;
use bb8::Pool;
use bb8_redis::RedisConnectionManager;
use std::collections::BTreeMap;

use crate::matching::engine::run_matching_tick;
use crate::matching::recovery::{parse_recovered_players, sync_from_redis};
use crate::models::StagedPlayer;

pub struct MatchPool {
    pub name: String,
    pub queue: BTreeMap<(String, bool, u32, String), StagedPlayer>,
    pub pool: Pool<RedisConnectionManager>,
}

impl Supervised for MatchPool {
    fn restarting(&mut self, _ctx: &mut Self::Context) {
        eprintln!(
            "[CRITICAL] {} crashed! Supervisor auto-rebooting...",
            self.name
        );
    }
}

impl Actor for MatchPool {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        ctx.set_mailbox_capacity(512);

        println!("[SYSTEM] {} active and protected.", self.name);
        let pool_name = self.name.clone();
        let pool = self.pool.clone();
        ctx.spawn(
            actix::fut::wrap_future(async move {
                let raw_players = sync_from_redis(pool, &pool_name).await;
                (raw_players, pool_name)
            })
            .map(|(raw_players, pool_name), actor: &mut MatchPool, _ctx| {
                let recovered = parse_recovered_players(raw_players, &pool_name);
                actor.queue = recovered;
            }),
        );
    }
}

impl Handler<StagedPlayer> for MatchPool {
    type Result = ();

    fn handle(&mut self, player: StagedPlayer, ctx: &mut Self::Context) {
        let key = (
            player.parsed.time_slot.clone(),
            player.parsed.is_rated,
            player.parsed.rating,
            player.parsed.user_id.clone(),
        );
        self.queue.insert(key, player);

        if self.queue.len() < 2 {
            println!(
                "[WAITING] {} — only {} player in queue, need ≥2 to match.",
                self.name,
                self.queue.len()
            );
            return;
        }

        let queue = std::mem::take(&mut self.queue);
        let pool = self.pool.clone();

        ctx.spawn(
            actix::fut::wrap_future(async move {
                let mut conn = match pool.get().await {
                    Ok(c) => c,
                    Err(_) => return queue,
                };
                run_matching_tick(queue, &mut *conn).await
            })
            .map(|updated, actor: &mut MatchPool, _ctx| {
                actor.queue.extend(updated);
            }),
        );
    }
}
