"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TournamentListItem } from "./types";
import { TOURNAMENT_TYPE_CONFIGS } from "./TournamentTypesSidebar";
import styles from "./TournamentList.module.css";

interface Props {
  tournaments: TournamentListItem[];
  myTournaments: TournamentListItem[];
  loading: boolean;
  onJoin: (id: string) => void;
  joiningId: string | null;
  onRetry: () => void;
  now: Date;
  emptyLabel?: string;
  emptySub?: string;
}

const STATUS_META: Record<string, { cls: string }> = {
  DRAFT: { cls: "draft" },
  REGISTRATION_OPEN: { cls: "open" },
  REGISTRATION_CLOSED: { cls: "closed" },
  NOT_INITIALIZED: { cls: "soon" },
  IN_PROGRESS: { cls: "live" },
  COMPLETED: { cls: "done" },
  CANCELLED: { cls: "cancelled" },
};

function timeLeft(t: TournamentListItem, now: Date): string {
  if (!t.timeManagement) return t.status.replace(/_/g, " ").toLowerCase();
  const start = new Date(t.timeManagement.startTime).getTime();
  const end = t.timeManagement.endTime
    ? new Date(t.timeManagement.endTime).getTime()
    : null;
  const nowMs = now.getTime();

  if (t.status === "IN_PROGRESS" && end) {
    const ms = end - nowMs;
    if (ms <= 0) return "Ended";
    const m = Math.floor(ms / 60000);
    return m > 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m} mins left`;
  }
  if (t.status === "REGISTRATION_OPEN" || t.status === "NOT_INITIALIZED") {
    const ms = start - nowMs;
    if (ms <= 0) return "Starting soon";
    const m = Math.floor(ms / 60000);
    if (m > 60) return `Starts in ${Math.floor(m / 60)}h ${m % 60}m`;
    return `Starts in ${m}m`;
  }
  if (t.status === "COMPLETED") return "Completed";
  if (t.status === "CANCELLED") return "Cancelled";
  return t.status.replace(/_/g, " ").toLowerCase();
}

function duration(t: TournamentListItem): string {
  if (!t.timeManagement) return "—";
  const start = new Date(t.timeManagement.startTime).getTime();
  const end = t.timeManagement.endTime
    ? new Date(t.timeManagement.endTime).getTime()
    : null;
  if (!end) return "—";
  const ms = end - start;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hr${h > 1 ? "s" : ""}`;
  return `${m}m`;
}

function sameHour(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getHours() === db.getHours() && da.toDateString() === db.toDateString()
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function TournamentRow({
  t,
  now,
  isMine,
  showTime,
  showNowLine,
  onJoin,
  joiningId,
}: {
  t: TournamentListItem;
  now: Date;
  isMine: boolean;
  showTime: boolean;
  showNowLine: boolean;
  onJoin: (id: string) => void;
  joiningId: string | null;
}) {
  const router = useRouter();
  const cfg = TOURNAMENT_TYPE_CONFIGS.find((c) => c.id === t.tournamentType);
  const meta = STATUS_META[t.status] ?? { cls: "draft" };
  const tl = timeLeft(t, now);
  const dur = duration(t);
  const canJoin =
    !isMine &&
    (t.status === "REGISTRATION_OPEN" || t.status === "NOT_INITIALIZED");

  return (
    <>
      {showNowLine && (
        <tr className={styles.nowRow}>
          <td colSpan={8}>
            <div className={styles.nowBar}>
              <span className={styles.nowTime}>
                {now.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              <span className={styles.nowLine} />
            </div>
          </td>
        </tr>
      )}
      <tr
        className={`${styles.row} ${isMine ? styles.rowMine : ""}`}
        onClick={() => router.push(`/tournament/${t.id}`)}
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" && router.push(`/tournament/${t.id}`)
        }
      >
        {/* Time */}
        <td className={styles.tdTime}>
          {showTime && t.timeManagement && (
            <span className={styles.timeLabel}>
              {new Date(t.timeManagement.startTime).toLocaleTimeString(
                "en-US",
                {
                  hour: "numeric",
                  hour12: true,
                },
              )}
            </span>
          )}
        </td>

        {/* Type icon */}
        <td className={styles.tdType}>
          <span
            className={styles.typeIcon}
            style={{ color: cfg?.color ?? "#7a7673" }}
          >
            {cfg?.icon}
          </span>
        </td>

        {/* Name */}
        <td className={styles.tdName}>
          <span className={styles.name}>{t.name}</span>
          {t.isRated && <span className={styles.rated} title="Rated" />}
        </td>

        {/* Game time */}
        <td className={styles.tdMeta}>
          {t.timeControl ? (
            <span className={styles.metaVal}>{t.timeControl.label}</span>
          ) : (
            <span className={styles.metaDim}>—</span>
          )}
        </td>

        {/* Duration */}
        <td className={styles.tdMeta}>
          <span className={styles.metaVal}>{dur}</span>
        </td>

        {/* Status */}
        <td className={styles.tdStatus}>
          <span className={`${styles.statusTxt} ${styles[`s_${meta.cls}`]}`}>
            {meta.cls === "live" && <span className={styles.liveDot} />}
            {tl}
          </span>
        </td>

        {/* Players */}
        <td className={styles.tdPlayers}>
          <span className={styles.players}>
            <svg
              viewBox="0 0 14 14"
              width="11"
              height="11"
              className={styles.personIcon}
            >
              <path
                fill="currentColor"
                d="M7 7a3 3 0 100-6 3 3 0 000 6zm-6 6c0-3.314 2.686-6 6-6s6 2.686 6 6H1z"
              />
            </svg>
            {t.participantCount}
            {t.maxPlayers ? `/${t.maxPlayers}` : ""}
          </span>
        </td>

        {/* Action */}
        <td className={styles.tdAction} onClick={(e) => e.stopPropagation()}>
          {isMine ? (
            <button
              type="button"
              className={styles.btnView}
              onClick={() => router.push(`/tournament/${t.id}`)}
            >
              {t.status === "IN_PROGRESS" ? "Play" : "View"}
            </button>
          ) : canJoin ? (
            <button
              type="button"
              className={styles.btnJoin}
              onClick={() => onJoin(t.id)}
              disabled={joiningId === t.id}
            >
              {joiningId === t.id ? "…" : "Join"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnWatch}
              onClick={() => router.push(`/tournament/${t.id}`)}
            >
              Watch
            </button>
          )}
        </td>
      </tr>
    </>
  );
}

// ─── TournamentList ───────────────────────────────────────────────────────────

export default function TournamentList({
  tournaments,
  myTournaments,
  loading,
  onJoin,
  joiningId,
  onRetry,
  now,
  emptyLabel = "No tournaments found",
  emptySub = "Try adjusting your filters or create a new tournament.",
}: Props) {
  if (loading) {
    return (
      <div className={styles.loading}>
        <RefreshCw size={15} className={styles.spin} />
        <span>Loading…</span>
      </div>
    );
  }

  const myIds = new Set(myTournaments.map((t) => t.id));

  const sorted = [...tournaments]
    .filter((t) => !myIds.has(t.id))
    .sort((a, b) => {
      const at = a.timeManagement
        ? new Date(a.timeManagement.startTime).getTime()
        : 0;
      const bt = b.timeManagement
        ? new Date(b.timeManagement.startTime).getTime()
        : 0;
      return at - bt;
    });

  const nowMs = now.getTime();
  let nowRowIdx = sorted.findIndex(
    (t) =>
      t.timeManagement &&
      new Date(t.timeManagement.startTime).getTime() > nowMs,
  );
  if (nowRowIdx === -1) nowRowIdx = sorted.length;

  if (sorted.length === 0 && myTournaments.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>♟</span>
        <p className={styles.emptyTitle}>{emptyLabel}</p>
        <p className={styles.emptySub}>{emptySub}</p>
        <button type="button" className={styles.retryBtn} onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* My tournaments pinned section */}
      {myTournaments.length > 0 && (
        <div className={styles.pinnedSection}>
          <span className={styles.pinnedLabel}>My Tournaments</span>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colTime} />
              <col className={styles.colType} />
              <col />
              <col className={styles.colGameTime} />
              <col className={styles.colDuration} />
              <col className={styles.colStatus} />
              <col className={styles.colPlayers} />
              <col className={styles.colAction} />
            </colgroup>
            <tbody>
              {myTournaments.map((t, i) => (
                <TournamentRow
                  key={t.id}
                  t={t}
                  now={now}
                  isMine
                  showTime={
                    i === 0 ||
                    !sameHour(
                      t.timeManagement?.startTime,
                      myTournaments[i - 1]?.timeManagement?.startTime,
                    )
                  }
                  showNowLine={false}
                  onJoin={onJoin}
                  joiningId={joiningId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Main table — only rendered when there are non-mine tournaments */}
      {sorted.length > 0 && (
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colTime} />
            <col className={styles.colType} />
            <col />
            <col className={styles.colGameTime} />
            <col className={styles.colDuration} />
            <col className={styles.colStatus} />
            <col className={styles.colPlayers} />
            <col className={styles.colAction} />
          </colgroup>
          <thead>
            <tr className={styles.theadRow}>
              <th className={`${styles.th} ${styles.thTime}`}>Time</th>
              <th className={`${styles.th} ${styles.thType}`}>Type</th>
              <th className={styles.th}></th>
              <th className={styles.th}>Game Time</th>
              <th className={styles.th}>Duration</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Players</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <TournamentRow
                key={t.id}
                t={t}
                now={now}
                isMine={myIds.has(t.id)}
                showTime={
                  i === 0 ||
                  !sameHour(
                    t.timeManagement?.startTime,
                    sorted[i - 1]?.timeManagement?.startTime,
                  )
                }
                showNowLine={i === nowRowIdx}
                onJoin={onJoin}
                joiningId={joiningId}
              />
            ))}
            {nowRowIdx === sorted.length && (
              <tr className={styles.nowRow}>
                <td colSpan={8}>
                  <div className={styles.nowBar}>
                    <span className={styles.nowTime}>
                      {now.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                    <span className={styles.nowLine} />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
