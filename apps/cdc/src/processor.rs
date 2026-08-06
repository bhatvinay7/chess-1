use std::time::Duration;

use native_tls::TlsConnector;
use postgres_native_tls::MakeTlsConnector;
use tokio::sync::mpsc;
use tokio_postgres::NoTls;

use pgwire_replication::{Lsn, PgWireError, ReplicationClient, ReplicationEvent};
use redis_rustclient::RedisClient;

use crate::{
    config::AppConfig,
    decoder::{RelationRegistry, WalEvent},
    models::{TABLE_NAME, TournamentTiming},
    scheduler,
};

// SQLSTATE 55006 — object_in_use (slot held by another backend)
const SQLSTATE_OBJECT_IN_USE: &str = "55006";

type Error = Box<dyn std::error::Error + Send + Sync>;

// ── Domain event type ─────────────────────────────────────────────────────────

#[derive(Debug)]
enum CdcEvent {
    Schedule {
        timing_id: String,
        tournament_id: String,
        start_time: String,
    },
    Reschedule {
        tournament_id: String,
        new_start_time: String,
    },
    Cancel {
        timing_id: String,
    },
}

struct WalMessage {
    lsn: Lsn,
    event: CdcEvent,
}

// ── Entry point ───────────────────────────────────────────────────────────────

pub async fn run() -> Result<(), Error> {
    let cfg = AppConfig::from_env();
    let redis_url = cfg.redis_url.clone();
    let mut redis = RedisClient::new(&redis_url).await?;

    // Fail fast: verify wal_level and publication before touching the slot.
    precheck(&cfg).await?;

    // Seed Redis from rows that already exist in TournamentTimeManagement.
    // The WAL stream only delivers *future* changes; without this, any row
    // inserted before the slot was first used would never appear in the ZSET.
    eprintln!("[CDC] running initial snapshot to seed existing rows ...");
    let snap_client = plain_client(&cfg).await?;
    match scheduler::init_snapshot(&mut redis, &snap_client).await {
        Ok(n) => eprintln!("[CDC] snapshot done ({n} new jobs seeded)"),
        Err(e) => eprintln!("[CDC] snapshot failed (non-fatal): {e}"),
    }

    // Find the earliest LSN the sync-worker has not yet confirmed.
    // cdc:pending_lsns tracks every job the CDC wrote but the sync-worker
    // hasn't consumed yet (sync-worker does HDEL when done).
    // Replaying from here guarantees every pending job is re-delivered.
    // Re-delivery is safe: sync-worker checks the DB before creating a round.
    let pending_lsn = scheduler::get_earliest_pending_lsn(&mut redis).await;
    let (slot_lsn, restart_lsn) = ensure_slot(&cfg).await?;

    // Only replay from a pending LSN if it's within the slot's retained WAL.
    // If pending_lsn < restart_lsn the WAL has already been purged and
    // START_REPLICATION would error; fall back to slot_lsn instead.
    let start_lsn = match pending_lsn {
        Some(pl) if pl < slot_lsn && pl >= restart_lsn => {
            eprintln!("[CDC] unprocessed jobs found — replaying from pending LSN {pl}");
            pl
        }
        Some(pl) if pl < slot_lsn => {
            eprintln!(
                "[CDC] pending LSN {pl} is before slot restart_lsn {restart_lsn} \
                 (WAL purged) — starting from slot LSN {slot_lsn} instead"
            );
            slot_lsn
        }
        _ => slot_lsn,
    };

    let (event_tx, event_rx) = mpsc::channel::<WalMessage>(512);
    let (lsn_ack_tx, mut lsn_ack_rx) = mpsc::unbounded_channel::<Lsn>();

    tokio::spawn(scheduler_task(event_rx, lsn_ack_tx, redis));

    eprintln!(
        "[CDC] connecting to PostgreSQL WAL slot='{}' pub='{}'",
        cfg.slot, cfg.publication
    );

    let mut registry = RelationRegistry::new();
    let mut current_lsn = start_lsn;

    loop {
        let mut client = loop {
            match ReplicationClient::connect(cfg.to_replication_config(current_lsn)).await {
                Ok(c) => break c,
                Err(e) if is_slot_active_error(&e) => {
                    eprintln!(
                        "[CDC] slot '{}' held by another process — killing via SQL and retrying",
                        cfg.slot
                    );
                    if let Ok(pg) = plain_client(&cfg).await
                        && let Ok(Some(row)) = pg
                            .query_opt(
                                "SELECT active_pid FROM pg_replication_slots \
                             WHERE slot_name = $1 AND active_pid IS NOT NULL",
                                &[&cfg.slot],
                            )
                            .await
                    {
                        let pid: i32 = row.get(0);
                        eprintln!("[CDC] terminating blocking PID {pid}");
                        let _ = pg.execute("SELECT pg_terminate_backend($1)", &[&pid]).await;
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
                Err(e) => return Err(Box::new(e)),
            }
        };

        eprintln!("[CDC] streaming WAL events");
        let result = wal_reader_loop(
            &mut client,
            &mut registry,
            event_tx.clone(),
            &mut lsn_ack_rx,
        )
        .await;

        // Drop the client BEFORE calling ensure_slot so the old TCP connection
        // is closed and the PostgreSQL backend can release the slot before we
        // query active_pid and potentially call pg_terminate_backend.
        drop(client);

        match result {
            Ok(()) => {
                // Stream closed normally (server EOF / StoppedAt).  We never
                // set stop_at_lsn so this shouldn't happen during normal CDC,
                // but reconnect anyway rather than exiting.
                eprintln!("[CDC] stream closed by server — reconnecting");
            }
            Err(e) => {
                eprintln!("[CDC] stream error — reconnecting: {e}");
            }
        }

        // Brief pause so PostgreSQL has time to clean up the old backend
        // before we query active_pid / attempt a new START_REPLICATION.
        tokio::time::sleep(Duration::from_millis(1_000)).await;

        // Ask Postgres: slot exists → get its current LSN; purged → re-create it.
        (current_lsn, _) = ensure_slot(&cfg).await?;
    }
}

fn is_slot_active_error(e: &PgWireError) -> bool {
    matches!(e, PgWireError::Server(msg) if msg.contains(SQLSTATE_OBJECT_IN_USE))
}

// ── Control-plane setup ───────────────────────────────────────────────────────

async fn plain_client(cfg: &AppConfig) -> Result<tokio_postgres::Client, Error> {
    let dsn = format!(
        "host={} port={} user={} password={} dbname={}",
        cfg.host, cfg.port, cfg.user, cfg.password, cfg.database,
    );
    if cfg.ssl_required {
        let connector = TlsConnector::new()?;
        let (client, conn) =
            tokio_postgres::connect(&dsn, MakeTlsConnector::new(connector)).await?;
        tokio::spawn(async move {
            let _ = conn.await;
        });
        Ok(client)
    } else {
        let (client, conn) = tokio_postgres::connect(&dsn, NoTls).await?;
        tokio::spawn(async move {
            let _ = conn.await;
        });
        Ok(client)
    }
}

// Returns (start_lsn, restart_lsn).
// start_lsn  = confirmed_flush_lsn (last acked) or restart_lsn (for a fresh slot).
// restart_lsn = earliest WAL position the slot has retained; replaying before
//               this would fail with "WAL segment has already been removed".
// ── Pre-flight checks ─────────────────────────────────────────────────────────
// Called once at startup. Catches misconfiguration that would otherwise cause
// the CDC to run silently (connected, keepalives arrive, but zero row events).

async fn precheck(cfg: &AppConfig) -> Result<(), Error> {
    let client = plain_client(cfg).await?;

    // wal_level must be 'logical'; 'replica' / 'minimal' never produce row changes.
    let row = client.query_one("SHOW wal_level", &[]).await?;
    let wal_level: &str = row.get(0);
    if wal_level != "logical" {
        return Err(format!(
            "wal_level is '{wal_level}' — set wal_level=logical in postgresql.conf \
             and restart PostgreSQL before the CDC can receive row events"
        )
        .into());
    }

    // Publication must exist AND include the target table.
    // If the publication is missing the table, START_REPLICATION succeeds but
    // sends zero INSERT/UPDATE/DELETE events — the silent no-events bug.
    let pub_row = client
        .query_opt(
            "SELECT 1 FROM pg_publication_tables \
             WHERE pubname = $1 AND tablename = $2",
            &[&cfg.publication, &TABLE_NAME],
        )
        .await?;

    if pub_row.is_none() {
        // Distinguish "publication missing" from "table not in publication"
        // so the operator gets an actionable message.
        let pub_exists = client
            .query_opt(
                "SELECT 1 FROM pg_publication WHERE pubname = $1",
                &[&cfg.publication],
            )
            .await?
            .is_some();

        return Err(if pub_exists {
            format!(
                "publication '{}' exists but does not include table '{TABLE_NAME}' — \
                 run: ALTER PUBLICATION {} ADD TABLE \"{TABLE_NAME}\"",
                cfg.publication, cfg.publication
            )
        } else {
            format!(
                "publication '{}' not found — \
                 run: CREATE PUBLICATION {} FOR TABLE \"{TABLE_NAME}\"",
                cfg.publication, cfg.publication
            )
        }
        .into());
    }

    eprintln!(
        "[CDC] precheck ok: wal_level=logical, publication='{}' includes '{TABLE_NAME}'",
        cfg.publication
    );
    Ok(())
}

// ── Slot management ───────────────────────────────────────────────────────────

async fn ensure_slot(cfg: &AppConfig) -> Result<(Lsn, Lsn), Error> {
    let client = plain_client(cfg).await?;

    let existing = client
        .query_opt(
            "SELECT confirmed_flush_lsn::text, restart_lsn::text \
             FROM pg_replication_slots WHERE slot_name = $1",
            &[&cfg.slot],
        )
        .await?;

    let row = if let Some(r) = existing {
        eprintln!("[CDC] slot '{}' already exists — reusing", cfg.slot);
        r
    } else {
        // Use a parameterised query so the slot name never touches string formatting.
        client
            .query_one(
                "SELECT lsn FROM pg_create_logical_replication_slot($1, 'pgoutput')",
                &[&cfg.slot],
            )
            .await
            .map_err(|e| format!("failed to create replication slot '{}': {e}", cfg.slot))?;
        eprintln!("[CDC] created replication slot '{}'", cfg.slot);
        client
            .query_one(
                "SELECT confirmed_flush_lsn::text, restart_lsn::text \
                 FROM pg_replication_slots WHERE slot_name = $1",
                &[&cfg.slot],
            )
            .await?
    };

    let parse_lsn = |col: Option<String>, label: &str| -> Result<Lsn, Error> {
        match col {
            Some(s) => Lsn::parse(&s)
                .map_err(|e| format!("bad {label} LSN from pg_replication_slots: {e}").into()),
            None => Ok(Lsn::ZERO),
        }
    };

    let confirmed: Option<String> = row.get(0);
    let restart: Option<String> = row.get(1);

    let restart_lsn = parse_lsn(restart.clone(), "restart_lsn")?;
    let start_lsn = parse_lsn(confirmed.or(restart), "confirmed_flush_lsn")?;

    eprintln!(
        "[CDC] slot='{}' start_lsn={start_lsn} restart_lsn={restart_lsn}",
        cfg.slot
    );

    // Kick out any existing connection holding the slot so START_REPLICATION succeeds.
    // A stale process from a previous run keeps the slot "active" indefinitely.
    if let Some(pid_row) = client
        .query_opt(
            "SELECT active_pid FROM pg_replication_slots \
             WHERE slot_name = $1 AND active_pid IS NOT NULL",
            &[&cfg.slot],
        )
        .await?
    {
        let active_pid: i32 = pid_row.get(0);
        eprintln!(
            "[CDC] slot '{}' held by PID {active_pid} — terminating",
            cfg.slot
        );
        let _ = client
            .execute("SELECT pg_terminate_backend($1)", &[&active_pid])
            .await;
        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    Ok((start_lsn, restart_lsn))
}

// ── WAL reader ────────────────────────────────────────────────────────────────

async fn wal_reader_loop(
    client: &mut ReplicationClient,
    registry: &mut RelationRegistry,
    event_tx: mpsc::Sender<WalMessage>,
    lsn_ack_rx: &mut mpsc::UnboundedReceiver<Lsn>,
) -> Result<(), Error> {
    let mut keepalive_count: u64 = 0;

    loop {
        while let Ok(lsn) = lsn_ack_rx.try_recv() {
            client.update_applied_lsn(lsn);
        }

        match client.recv().await? {
            Some(ReplicationEvent::XLogData { wal_end, data, .. }) => {
                let tag = data.first().copied().unwrap_or(0);
                eprintln!(
                    "[CDC] XLogData lsn={wal_end} tag=0x{tag:02X}('{}')",
                    tag as char
                );
                let raw = registry.process_message(&data);
                match &raw {
                    WalEvent::Skip => {}
                    WalEvent::Insert { table, .. } if table != TABLE_NAME => {
                        eprintln!(
                            "[CDC] INSERT on unexpected table '{table}' — publication mismatch?"
                        );
                    }
                    WalEvent::Update { table, .. } if table != TABLE_NAME => {
                        eprintln!(
                            "[CDC] UPDATE on unexpected table '{table}' — publication mismatch?"
                        );
                    }
                    WalEvent::Delete { table, .. } if table != TABLE_NAME => {
                        eprintln!(
                            "[CDC] DELETE on unexpected table '{table}' — publication mismatch?"
                        );
                    }
                    _ => {}
                }
                if let Some(event) = into_cdc_event(raw)
                    && event_tx
                        .send(WalMessage {
                            lsn: wal_end,
                            event,
                        })
                        .await
                        .is_err()
                {
                    break;
                }
            }

            Some(ReplicationEvent::KeepAlive { wal_end, .. }) => {
                keepalive_count += 1;
                // Log every 12th keepalive (~60s at 5s interval) to show we're alive.
                if keepalive_count == 1 || keepalive_count.is_multiple_of(12) {
                    eprintln!(
                        "[CDC] keepalive #{keepalive_count} wal_end={wal_end} (no WAL events yet — insert a row to test)"
                    );
                }
                while let Ok(lsn) = lsn_ack_rx.try_recv() {
                    client.update_applied_lsn(lsn);
                }
            }

            Some(ReplicationEvent::Begin { final_lsn, .. }) => {
                eprintln!("[CDC] BEGIN final_lsn={final_lsn}");
            }

            Some(ReplicationEvent::Commit { end_lsn, .. }) => {
                eprintln!("[CDC] COMMIT end_lsn={end_lsn}");
            }

            Some(ReplicationEvent::StoppedAt { reached }) => {
                eprintln!("[CDC] stream stopped at LSN {reached}");
                break;
            }

            Some(other) => {
                eprintln!("[CDC] unexpected event: {other:?}");
            }

            None => {
                eprintln!("[CDC] stream closed by server");
                break;
            }
        }
    }
    Ok(())
}

fn into_cdc_event(event: WalEvent) -> Option<CdcEvent> {
    match event {
        WalEvent::Insert { table, fields } if table == TABLE_NAME => {
            let timing = TournamentTiming::from_fields(&fields).or_else(|| {
                eprintln!(
                    "[CDC] INSERT on {TABLE_NAME}: from_fields failed — WAL fields: {:?}",
                    fields.keys().collect::<Vec<_>>()
                );
                None
            })?;
            Some(CdcEvent::Schedule {
                timing_id: timing.id,
                tournament_id: timing.tournament_id,
                start_time: timing.start_time,
            })
        }

        WalEvent::Update { table, new_fields } if table == TABLE_NAME => {
            let tournament_id = new_fields.get("tournamentId").and_then(|v| v.as_deref()).map(str::to_string).or_else(|| {
                eprintln!("[CDC] UPDATE on {TABLE_NAME}: missing/null 'tournamentId' in WAL new_fields");
                None
            })?;
            let new_start_time = new_fields
                .get("startTime")
                .and_then(|v| v.as_deref())
                .map(str::to_string)
                .or_else(|| {
                    eprintln!(
                        "[CDC] UPDATE on {TABLE_NAME}: missing/null 'startTime' in WAL new_fields"
                    );
                    None
                })?;
            Some(CdcEvent::Reschedule {
                tournament_id,
                new_start_time,
            })
        }

        WalEvent::Delete { table, key_fields } if table == TABLE_NAME => {
            let timing_id = key_fields
                .get("id")
                .and_then(|v| v.as_deref())
                .map(str::to_string)
                .or_else(|| {
                    eprintln!("[CDC] DELETE on {TABLE_NAME}: missing/null 'id' in WAL key_fields");
                    None
                })?;
            Some(CdcEvent::Cancel { timing_id })
        }

        _ => None,
    }
}

// ── Scheduler task ────────────────────────────────────────────────────────────

async fn scheduler_task(
    mut rx: mpsc::Receiver<WalMessage>,
    lsn_ack_tx: mpsc::UnboundedSender<Lsn>,
    mut redis: RedisClient,
) {
    while let Some(WalMessage { lsn, event }) = rx.recv().await {
        let lsn_str = lsn.to_string();

        let mut retries = 0;
        let result = loop {
            let res = match &event {
                CdcEvent::Schedule {
                    timing_id,
                    tournament_id,
                    start_time,
                } => {
                    if retries == 0 {
                        eprintln!("[CDC] INSERT → schedule tournamentId={tournament_id}");
                    }
                    scheduler::schedule_tournament(
                        &mut redis,
                        timing_id,
                        tournament_id,
                        start_time,
                        &lsn_str,
                    )
                    .await
                }

                CdcEvent::Reschedule {
                    tournament_id,
                    new_start_time,
                } => {
                    if retries == 0 {
                        eprintln!("[CDC] UPDATE → reschedule tournamentId={tournament_id}");
                    }
                    scheduler::reschedule_tournament(
                        &mut redis,
                        tournament_id,
                        new_start_time,
                        &lsn_str,
                    )
                    .await
                }

                CdcEvent::Cancel { timing_id } => {
                    if retries == 0 {
                        eprintln!("[CDC] DELETE → cancel timing_id={timing_id}");
                    }
                    scheduler::cancel_tournament(&mut redis, timing_id).await
                }
            };

            match res {
                Ok(_) => break Ok(()),
                Err(e) => {
                    retries += 1;
                    if retries >= 3 {
                        break Err(e);
                    }
                    eprintln!("[CDC] Redis error '{e}', retrying ({retries}/3)...");
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                }
            }
        };

        match result {
            Ok(_) => {
                let _ = lsn_ack_tx.send(lsn);
            }
            Err(e) => {
                eprintln!("[CDC] scheduler error (exhausted retries): {e}");
                // If we completely exhaust retries, we could panic to restart,
                // but logging it and relying on manual/system restart is safer
                // than a continuous crash loop if Redis is permanently down.
                // We'll leave it as an error log, but now transient drops will succeed!
            }
        }
    }
}
