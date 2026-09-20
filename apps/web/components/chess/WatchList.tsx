"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useWatchList, type LiveGame } from "../../hooks/useWatchList";
import styles from "./WatchList.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

type TimeCategory = "ALL" | "BULLET" | "BLITZ" | "RAPID" | "CLASSIC";

function classifyTimeSlot(slot: string): Exclude<TimeCategory, "ALL"> {
  const parts = slot.split("+");
  const mins = parseFloat(parts[0] ?? "5") || 5;
  const inc = parseFloat(parts[1] ?? "0") || 0;
  const est = mins * 60 + inc * 40;
  if (est < 179) return "BULLET";
  if (est < 599) return "BLITZ";
  if (est < 1800) return "RAPID";
  return "CLASSIC";
}

const TC_META: Record<
  Exclude<TimeCategory, "ALL">,
  { icon: string; cls: string }
> = {
  BULLET: { icon: "⚡", cls: styles.tcBullet ?? "" },
  BLITZ: { icon: "🔥", cls: styles.tcBlitz ?? "" },
  RAPID: { icon: "⏱", cls: styles.tcRapid ?? "" },
  CLASSIC: { icon: "♟", cls: styles.tcClassic ?? "" },
};

const DEFAULT_AVATAR = "/defaultUser.jpg";

// ── WatchGameCard ─────────────────────────────────────────────────────────────

function WatchGameCard({
  game,
  layout = "grid",
}: {
  game: LiveGame;
  layout?: "grid" | "list";
}) {
  const router = useRouter();
  const tc = classifyTimeSlot(game.timeSlot);
  const tcMeta = TC_META[tc];
  const accent =
    tcMeta.icon === "🔥"
      ? "#f28b38"
      : tcMeta.icon === "⚡"
        ? "#ef4444"
        : "#81b64c";

  const p1IsWhite = game.player1.id === game.whitePlayerId;
  const white = p1IsWhite ? game.player1 : game.player2;
  const black = p1IsWhite ? game.player2 : game.player1;

  const handleClick = () => router.push(`/spectate/${game.gameId}`);

  if (layout === "list") {
    return (
      <div
        className={styles.listCard}
        style={{ "--card-accent": accent } as React.CSSProperties}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        <div className={styles.listAccentBar} style={{ background: accent }} />

        {/* Time control badge */}
        <div className={styles.listTc}>
          <span className={styles.timeIcon}>{tcMeta.icon}</span>
          <span className={styles.timeSlot}>{game.timeSlot}</span>
          <span className={`${styles.tcBadge} ${tcMeta.cls}`}>{tc}</span>
          {game.isRated && <span className={styles.ratedBadge}>Rated</span>}
        </div>

        {/* Players — horizontal row: black vs white */}
        <div className={styles.listPlayers}>
          {[
            { p: black, dot: styles.colorDotBlack },
            { p: white, dot: styles.colorDotWhite },
          ].map(({ p, dot }, i) => (
            <div key={i} className={styles.listPlayer}>
              <div className={styles.avatar}>
                <img
                  src={p.profileImage || DEFAULT_AVATAR}
                  alt={p.username}
                  crossOrigin="anonymous"
                />
              </div>
              <span className={styles.playerName}>{p.username}</span>
              <span className={styles.playerRating}>{p.rating}</span>
              <span className={`${styles.colorDot} ${dot}`} />
            </div>
          ))}
          <span className={styles.listVs}>vs</span>
        </div>

        {/* Spectators */}
        {game.spectatorCount > 0 && (
          <span className={styles.specCount}>
            <span className={styles.eyeIcon}>👁</span>
            {game.spectatorCount}
          </span>
        )}

        <span className={styles.listWatch}>Watch →</span>
      </div>
    );
  }

  return (
    <div
      className={styles.card}
      style={{ "--card-accent": accent } as React.CSSProperties}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* Players */}
      <div className={styles.players}>
        <div className={styles.playerRow}>
          <div className={styles.avatar}>
            <img
              src={black.profileImage || DEFAULT_AVATAR}
              alt={black.username}
              crossOrigin="anonymous"
            />
          </div>
          <div className={styles.playerInfo}>
            <span className={styles.playerName}>{black.username}</span>
            <span className={styles.playerRating}>{black.rating}</span>
          </div>
          <span className={`${styles.colorDot} ${styles.colorDotBlack}`} />
        </div>

        <div className={styles.vsBar} />

        <div className={styles.playerRow}>
          <div className={styles.avatar}>
            <img
              src={white.profileImage || DEFAULT_AVATAR}
              alt={white.username}
              crossOrigin="anonymous"
            />
          </div>
          <div className={styles.playerInfo}>
            <span className={styles.playerName}>{white.username}</span>
            <span className={styles.playerRating}>{white.rating}</span>
          </div>
          <span className={`${styles.colorDot} ${styles.colorDotWhite}`} />
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.timeIcon}>{tcMeta.icon}</span>
          <span className={styles.timeSlot}>{game.timeSlot}</span>
          <span className={`${styles.tcBadge} ${tcMeta.cls}`}>{tc}</span>
          {game.isRated && <span className={styles.ratedBadge}>Rated</span>}
        </div>
        {game.spectatorCount > 0 && (
          <span className={styles.specCount}>
            <span className={styles.eyeIcon}>👁</span>
            {game.spectatorCount}
          </span>
        )}
      </div>
    </div>
  );
}

// ── WatchList ─────────────────────────────────────────────────────────────────

interface Props {
  enabled?: boolean;
  layout?: "grid" | "list";
}

const FILTERS: { id: TimeCategory; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "BULLET", label: "⚡ Bullet" },
  { id: "BLITZ", label: "🔥 Blitz" },
  { id: "RAPID", label: "⏱ Rapid" },
  { id: "CLASSIC", label: "♟ Classic" },
];

export function WatchList({ enabled = true, layout = "grid" }: Props) {
  const { games, loading, refresh } = useWatchList(enabled);
  const [filter, setFilter] = useState<TimeCategory>("ALL");

  const displayed =
    filter === "ALL"
      ? games
      : games.filter((g) => classifyTimeSlot(g.timeSlot) === filter);

  return (
    <div className={styles.wrap}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <span className={styles.liveDot} />
          <span className={styles.liveLabel}>Live</span>
          <span className={styles.count}>
            {games.length} game{games.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.chip} ${filter === f.id ? styles.chipActive : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={11} className={loading ? styles.spin : undefined} />{" "}
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading && games.length === 0 ? (
        <div className={styles.loadingRow}>
          <RefreshCw size={13} className={styles.spin} />
          <span>Loading live games…</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>👁</span>
          <p className={styles.emptyTitle}>No live games right now</p>
          <p className={styles.emptySub}>
            {filter !== "ALL"
              ? "Try a different time control filter."
              : "No active games right now. Check back soon."}
          </p>
        </div>
      ) : (
        <div className={layout === "list" ? styles.list : styles.grid}>
          {displayed.map((g) => (
            <WatchGameCard key={g.gameId} game={g} layout={layout} />
          ))}
        </div>
      )}
    </div>
  );
}
