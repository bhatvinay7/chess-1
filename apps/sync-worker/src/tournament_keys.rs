/// Shared Redis key constants for the tournament scheduling pipeline.
///
/// Both `tournament_consumer` and `handlers/tournament_schedule` import from here.
/// The CDC worker uses the same string values — keep them in sync if you rename.
pub const PENDING_ZSET: &str = "tournament:schedule:pending";
pub const PROCESSING_ZSET: &str = "tournament:schedule:processing";
pub const SCHEDULE_STREAM: &str = "tournament:schedule:stream";
pub const STREAM_GROUP: &str = "tournament-workers";
pub const JOB_PREFIX: &str = "tournament:job";
// CDC pending-LSN hash: CDC sets HSET <jid> <lsn> when writing a job;
// we clear it here (HDEL <jid>) once the job is fully processed.
pub const CDC_PENDING_LSNS: &str = "cdc:pending_lsns";
