use std::collections::HashMap;

pub const TABLE_NAME: &str = "TournamentTimeManagement";

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TournamentTiming {
    /// Primary key of the TournamentTimeManagement row.
    /// Stored in Redis so the DELETE path can look up tournamentId
    /// (DEFAULT replica identity only includes PK columns in DELETE events).
    pub id: String,
    pub tournament_id: String,
    pub start_time: String,
    /// Used to compute how far before startTime the trigger should fire:
    ///   gap > 30 min → trigger at 30 min before start
    ///   gap ≤ 30 min → trigger at 15 min before start
    pub registration_close_at: String,
}

impl TournamentTiming {
    pub fn from_fields(fields: &HashMap<String, Option<String>>) -> Option<Self> {
        Some(Self {
            id: fields.get("id")?.as_deref()?.to_string(),
            tournament_id: fields.get("tournamentId")?.as_deref()?.to_string(),
            start_time: fields.get("startTime")?.as_deref()?.to_string(),
            registration_close_at: fields.get("registrationCloseAt")?.as_deref()?.to_string(),
        })
    }
}

pub fn pg_timestamp_to_unix(s: &str) -> Option<i64> {
    use chrono::{DateTime, NaiveDateTime};

    let s = s.trim();

    let ts_with_tz = [
        "%Y-%m-%d %H:%M:%S%:z",
        "%Y-%m-%d %H:%M:%S%.f%:z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S%.f%z",
    ];
    for fmt in &ts_with_tz {
        if let Ok(dt) = DateTime::parse_from_str(s, fmt) {
            return Some(dt.timestamp());
        }
    }

    // PostgreSQL sometimes emits "+HH" (2-digit TZ) — expand to "+HH00" for %z
    if s.len() > 19 {
        let after_time = &s[19..];
        if let Some(tz_rel) = after_time.find(['+', '-']) {
            let tz_pos = 19 + tz_rel;
            let tz_digits = &s[tz_pos + 1..];
            if tz_digits.len() == 2 {
                let expanded = format!("{}{}00", &s[..tz_pos + 1], tz_digits);
                for fmt in &["%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S%.f%z"] {
                    if let Ok(dt) = DateTime::parse_from_str(&expanded, fmt) {
                        return Some(dt.timestamp());
                    }
                }
            }
        }
    }

    // Fallback: naive datetime, assume UTC
    NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f")
        .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
        .map(|dt| dt.and_utc().timestamp())
        .ok()
}
