"use client";

import {
  Users,
  Clock,
  Star,
  Lock,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { TournamentListItem } from "./types";
import { TOURNAMENT_TYPE_CONFIGS } from "./TournamentTypesSidebar";
import styles from "./TournamentCard.module.css";

interface Props {
  tournament: TournamentListItem;
  onJoin?: (id: string) => void;
  joining?: boolean;
  isMyTournament?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "draft" },
  REGISTRATION_OPEN: { label: "Open", cls: "open" },
  REGISTRATION_CLOSED: { label: "Closed", cls: "closed" },
  NOT_INITIALIZED: { label: "Soon", cls: "soon" },
  IN_PROGRESS: { label: "Live", cls: "live" },
  COMPLETED: { label: "Done", cls: "done" },
  CANCELLED: { label: "Cancelled", cls: "cancelled" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end?: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m > 0 ? m + "m" : ""}`.trim();
  return `${m}m`;
}

export default function TournamentCard({
  tournament: t,
  onJoin,
  joining,
  isMyTournament,
}: Props) {
  const router = useRouter();
  const typeConfig = TOURNAMENT_TYPE_CONFIGS.find(
    (c) => c.id === t.tournamentType,
  );
  const statusInfo = STATUS_LABELS[t.status] ?? {
    label: t.status,
    cls: "draft",
  };
  const fillPercent = t.maxPlayers
    ? Math.min(100, Math.round((t.participantCount / t.maxPlayers) * 100))
    : null;
  const duration = formatDuration(
    t.timeManagement.startTime,
    t.timeManagement.endTime,
  );

  const canJoin =
    !isMyTournament &&
    (t.status === "REGISTRATION_OPEN" || t.status === "NOT_INITIALIZED");

  return (
    <article
      className={`${styles.card} ${isMyTournament ? styles.cardMine : ""}`}
      onClick={() => router.push(`/tournament/${t.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/tournament/${t.id}`)}
      style={
        {
          "--type-color": typeConfig?.color ?? "#f28b38",
        } as React.CSSProperties
      }
    >
      {/* Left accent bar */}
      <span
        className={styles.accentBar}
        style={{ background: typeConfig?.color ?? "#f28b38" }}
      />

      {/* Banner image or type icon */}
      <span className={styles.typeIcon} style={{ color: typeConfig?.color }}>
        {typeConfig?.icon}
      </span>

      {/* Main content */}
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span
            className={`${styles.statusBadge} ${styles[`status_${statusInfo.cls}`]}`}
          >
            {statusInfo.cls === "live" && <span className={styles.liveDot} />}
            {statusInfo.label}
          </span>
          {t.isRated && (
            <span className={styles.tag}>
              <Star size={10} />
              Rated
            </span>
          )}
          {t.inviteOnly && (
            <span className={styles.tag}>
              <Lock size={10} />
              Invite
            </span>
          )}
          {t.premiumOnly && (
            <span className={styles.tag}>
              <Shield size={10} />
              Premium
            </span>
          )}
          {t.gameType === "CHESS960" && (
            <span className={styles.tag}>
              <Zap size={10} />
              960
            </span>
          )}
        </div>

        <h3 className={styles.name}>{t.name}</h3>

        {t.description && <p className={styles.desc}>{t.description}</p>}

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Users size={12} />
            {t.participantCount}
            {t.maxPlayers ? `/${t.maxPlayers}` : ""} players
          </span>
          <span className={styles.metaItem}>
            <Clock size={12} />
            {formatDate(t.timeManagement.startTime)}
          </span>
          {duration && <span className={styles.metaItem}>⏱ {duration}</span>}
          {t.timeControl && (
            <span className={styles.metaItem}>🕐 {t.timeControl.label}</span>
          )}
        </div>

        {fillPercent !== null && (
          <div className={styles.fillBar}>
            <div
              className={styles.fillProgress}
              style={{
                width: `${fillPercent}%`,
                background: typeConfig?.color ?? "#f28b38",
              }}
            />
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        {isMyTournament ? (
          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => router.push(`/tournament/${t.id}`)}
          >
            {t.status === "IN_PROGRESS" ? "▶ Play" : "View"}
            <ChevronRight size={13} />
          </button>
        ) : canJoin ? (
          <button
            type="button"
            className={styles.joinBtn}
            onClick={() => onJoin?.(t.id)}
            disabled={joining}
          >
            {joining ? "..." : "Join"}
          </button>
        ) : (
          <button
            type="button"
            className={styles.watchBtn}
            onClick={() => router.push(`/tournament/${t.id}`)}
          >
            Watch
          </button>
        )}
      </div>
    </article>
  );
}
