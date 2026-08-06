"use client";

import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CircleDot,
  Clock3,
  Crown,
  Gauge,
  Minus,
  PlayCircle,
  Search,
  Swords,
  Timer,
  Zap,
} from "lucide-react";
import type { GameHistoryItem, GameHistoryResult } from "../../app/lib/api/games";
import styles from "./GameHistory.module.css";

interface GameHistoryListProps {
  games: GameHistoryItem[];
  showReviewActions?: boolean;
  playerTag?: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function resultLabel(result: GameHistoryResult): string {
  if (result === "WIN") return "Win";
  if (result === "LOSS") return "Loss";
  if (result === "DRAW") return "Draw";
  return "Aborted";
}

function ratingText(rating?: number | null): string {
  return typeof rating === "number" ? String(rating) : "?";
}

function formatTimeControl(value: string): string {
  const [minutesRaw, incrementRaw = "0"] = value.split("+");
  const minutes = Number(minutesRaw);
  const increment = Number(incrementRaw);
  if (!Number.isFinite(minutes)) return value;
  if (increment > 0) return `${minutes}+${increment}`;
  return `${minutes} min`;
}

function ResultIcon({ result }: { result: GameHistoryResult }) {
  if (result === "WIN") return <Crown size={15} />;
  if (result === "LOSS") return <Swords size={15} />;
  if (result === "DRAW") return <Minus size={15} />;
  return <CircleDot size={15} />;
}

function FormatIcon({ gameName }: { gameName: string }) {
  if (gameName === "Bullet" || gameName === "Blitz") return <Zap size={12} />;
  return <Timer size={12} />;
}

/**
 * Vertical spike indicator: ↑ +12 (green) | ↓ -8 (red) | — 0 (neutral).
 * For unrated games the API always sends delta=0, so we naturally show flat.
 */
function EloDelta({ delta }: { delta: number }) {
  const isGain = delta > 0;
  const isLoss = delta < 0;
  const cls = isGain ? styles.eloGain : isLoss ? styles.eloLoss : styles.eloFlat;
  const label = isGain ? `+${delta}` : String(delta);

  return (
    <span className={`${styles.eloBadge} ${cls}`}>
      {isGain && <ArrowUp size={12} strokeWidth={2.8} />}
      {isLoss && <ArrowDown size={12} strokeWidth={2.8} />}
      {!isGain && !isLoss && <Minus size={12} strokeWidth={2.8} />}
      {label}
    </span>
  );
}

/** One player slot: avatar + name (you tag) + ELO at game time */
function PlayerSlot({
  id,
  username,
  profileImageUrl,
  rating,
  isYou,
  playerTag,
}: {
  id: string | null | undefined;
  username: string | null | undefined;
  profileImageUrl: string | null | undefined;
  rating: number | null | undefined;
  isYou: boolean;
  playerTag: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={`${styles.playerSlot} ${isYou ? styles.isYou : ""}`}
      onClick={() => id && router.push(`/users/${id}`)}
      disabled={!id}
    >
      <img
        src={profileImageUrl || "/defaultUser.jpg"}
        alt=""
        className={styles.avatar}
        crossOrigin="anonymous"
      />
      <div className={styles.playerInfo}>
        <div className={styles.playerNameRow}>
          <span className={styles.playerName}>{username ?? "Unknown"}</span>
          {isYou && <span className={styles.youTag}>{playerTag}</span>}
        </div>
        <span className={styles.playerElo}>{ratingText(rating)}</span>
      </div>
    </button>
  );
}

export function GameHistoryList({ games, showReviewActions = true, playerTag = "You" }: GameHistoryListProps) {
  const router = useRouter();

  if (games.length === 0) {
    return (
      <section className={`glass-panel ${styles.emptyState}`}>
        <Search size={28} />
        <h2>No completed games yet</h2>
        <p>Your finished rated and casual games will appear here after the sync worker stores them.</p>
      </section>
    );
  }

  return (
    <section className={styles.gameList} aria-label="Game history">
      {games.map((game) => {
        const isWhite = game.playerColor === "white";
        const resultClass = styles[game.result.toLowerCase()] ?? "";

        // ratingAfter comes directly from the DB (NULL for unrated → show "—")
        const playerRatingAfter = game.player.ratingAfter;

        const playerAccuracy =
          isWhite ? game.analysis?.whiteAccuracy : game.analysis?.blackAccuracy;

        return (
          <article className={`glass-panel ${styles.gameRow}`} key={game.id}>
            {/* ── Col 1: Result ── */}
            <div className={`${styles.resultCol} ${resultClass}`}>
              <ResultIcon result={game.result} />
              <strong>{resultLabel(game.result)}</strong>
              <span>{game.playerColor}</span>
            </div>

            {/* ── Col 2: Matchup — white vs black with names, ELOs ── */}
            <div className={styles.matchup}>
              <PlayerSlot
                id={game.whitePlayer?.id}
                username={game.whitePlayer?.username}
                profileImageUrl={game.whitePlayer?.profileImageUrl}
                rating={game.whitePlayer?.rating}
                isYou={isWhite}
                playerTag={playerTag}
              />
              <span className={styles.vs}>vs</span>
              <PlayerSlot
                id={game.blackPlayer?.id}
                username={game.blackPlayer?.username}
                profileImageUrl={game.blackPlayer?.profileImageUrl}
                rating={game.blackPlayer?.rating}
                isYou={!isWhite}
                playerTag={playerTag}
              />
            </div>

            {/* ── Col 3: ELO change (spike ↑/↓) ── */}
            <div className={styles.eloCol}>
              <span className={styles.eloColLabel}>Your ELO</span>
              <strong className={styles.eloAfter}>
                {typeof playerRatingAfter === "number" ? playerRatingAfter : "—"}
              </strong>
              <EloDelta delta={game.player.ratingDelta} />
            </div>

            {/* ── Col 4: Game meta ── */}
            <div className={styles.metaCol}>
              <span className={styles.metaChip}>
                <FormatIcon gameName={game.gameName} />
                {game.gameName}
              </span>
              <span className={styles.metaChip}>
                <Clock3 size={12} />
                {formatTimeControl(game.timeControl)}
              </span>
              <span className={styles.metaChip}>
                <Swords size={12} />
                {game.moveCount} moves
              </span>
              <span className={styles.metaChip}>
                <Gauge size={12} />
                {typeof playerAccuracy === "number"
                  ? `${playerAccuracy}%`
                  : "Pending"}
              </span>
            </div>

            {/* ── Col 5: Date + review ── */}
            <div className={styles.dateCol}>
              <span className={styles.dateText}>
                <CalendarDays size={12} />
                {formatDate(game.date)}
              </span>
              {showReviewActions && (
                <button
                  className={`${styles.reviewButton}${game.analysis?.reviewedAt ? ` ${styles.reviewedButton}` : ""}`}
                  type="button"
                  onClick={() => router.push(`/analysis/${game.id}`)}
                >
                  <PlayCircle size={12} />
                  {game.analysis?.reviewedAt ? "Reviewed" : "Review"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
