"use client";
import React, { useRef, useState } from "react";
import styles from "./ProfileCard.module.css";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Swords,
  Trophy,
  Zap,
  Flame,
  Clock,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useProfile, useUpdateProfile } from "../../hooks/useProfile";
import {
  useGameHistory,
  useRatingHistoryByCategory,
} from "../../hooks/useGameHistory";
import { uploadFile } from "../../app/lib/api/upload";
import type { RatingPoint } from "../../app/lib/api/games";
import { FriendsPanel } from "../social/FriendsPanel";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dhfyav4og/image/upload/v1779739162/defaultUser_afbf5y.jpg";
const PAGE_SIZE = 8;

type ProfileTab =
  | "Overview"
  | "Games"
  | "Stats"
  | "Friends"
  | "Awards"
  | "Clubs";
const TABS: ProfileTab[] = [
  "Overview",
  "Games",
  "Stats",
  "Friends",
  "Awards",
  "Clubs",
];

function formatJoinDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

function ratingBarWidth(rating: number): string {
  const pct = Math.min(100, Math.max(0, ((rating - 800) / (2800 - 800)) * 100));
  return `${pct.toFixed(1)}%`;
}

/* ── Chess.com-style time control icons ── */
const CAT_ICON: Record<string, React.ReactNode> = {
  BULLET: <Zap size={16} style={{ color: "#e85d5d" }} />,
  BLITZ: <Flame size={16} style={{ color: "#f59e0b" }} />,
  RAPID: <Clock size={16} style={{ color: "#3ecf8e" }} />,
};

/* ── Per-category SVG rating line chart ── */
const CAT_COLOR: Record<string, string> = {
  BULLET: "#e85d5d",
  BLITZ: "#f59e0b",
  RAPID: "#3ecf8e",
};

const CAT_GRAD_ID: Record<string, string> = {
  BULLET: "ratingGradBullet",
  BLITZ: "ratingGradBlitz",
  RAPID: "ratingGradRapid",
};

function CategoryRatingChart({
  category,
  points,
}: {
  category: "BULLET" | "BLITZ" | "RAPID";
  points: RatingPoint[];
}) {
  const W = 560,
    H = 130,
    PX = 28,
    PY = 14;
  const color = CAT_COLOR[category] ?? "#81b64c";
  const gradId = CAT_GRAD_ID[category] ?? "ratingGrad";

  if (points.length < 2) {
    return (
      <div
        style={{
          padding: "1.2rem",
          textAlign: "center",
          color: "var(--text-faint)",
          fontSize: "0.8rem",
        }}
      >
        Play rated {category.toLowerCase()} games to see your graph.
      </div>
    );
  }

  const ratings = points.map((p) => p.rating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = maxR - minR || 1;
  const iW = W - PX * 2;
  const iH = H - PY * 2;
  const toX = (i: number) => PX + (i / (points.length - 1)) * iW;
  const toY = (r: number) => PY + (1 - (r - minR) / range) * iH;

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.rating)}`).join(" ");
  const firstRating = points[0]!.rating;
  const lastRating = points[points.length - 1]!.rating;
  const area =
    `M ${toX(0)},${toY(firstRating)} ` +
    points.map((p, i) => `L ${toX(i)},${toY(p.rating)}`).join(" ") +
    ` L ${toX(points.length - 1)},${PY + iH} L ${toX(0)},${PY + iH} Z`;
  const delta = lastRating - firstRating;
  const deltaColor = delta >= 0 ? "#81b64c" : "#F87171";

  const yLabels = [0, 1, 2, 3].map((i) => ({
    value: Math.round(minR + (range * (3 - i)) / 3),
    y: PY + (i / 3) * iH,
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.4rem",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.73rem",
            fontWeight: 700,
            color: "var(--text-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {CAT_ICON[category]}
          {category.charAt(0) + category.slice(1).toLowerCase()} ·{" "}
          {points.length} rated games
        </span>
        <span
          style={{ fontSize: "0.78rem", color: deltaColor, fontWeight: 700 }}
        >
          {delta >= 0 ? "+" : ""}
          {delta} pts
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ overflow: "visible", display: "block" }}
        aria-label={`${category} rating history`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLabels.map(({ y, value }) => (
          <g key={value}>
            <line
              x1={PX}
              y1={y}
              x2={W - PX}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
            <text
              x={PX - 6}
              y={y + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.22)"
              fontSize="9"
            >
              {value}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => {
          const show =
            i === 0 ||
            i === points.length - 1 ||
            (points.length > 10 &&
              i % Math.max(1, Math.floor(points.length / 8)) === 0);
          if (!show) return null;
          const cx = toX(i);
          const cy = toY(p.rating);
          const isLast = i === points.length - 1;
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={isLast ? 5 : 3}
                fill={isLast ? "#f28b38" : color}
                stroke="#1a1a1a"
                strokeWidth="1.5"
              />
              {isLast && (
                <text
                  x={cx}
                  y={cy - 10}
                  textAnchor="middle"
                  fill="#f28b38"
                  fontSize="11"
                  fontWeight="700"
                >
                  {p.rating}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── 3-chart rating history wrapper ── */
function RatingHistoryCharts() {
  const { data, isLoading } = useRatingHistoryByCategory();
  const [activeTab, setActiveTab] = useState<"BULLET" | "BLITZ" | "RAPID">(
    "BLITZ",
  );

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "1.5rem",
          color: "var(--text-faint)",
          fontSize: "0.82rem",
        }}
      >
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />{" "}
        Loading rating history…
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "0.85rem",
          borderBottom: "1px solid var(--card-border)",
          paddingBottom: "0",
        }}
      >
        {(["BULLET", "BLITZ", "RAPID"] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveTab(cat)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.45rem 0.85rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: activeTab === cat ? CAT_COLOR[cat] : "var(--text-faint)",
              borderBottom: `2px solid ${activeTab === cat ? CAT_COLOR[cat] : "transparent"}`,
              marginBottom: "-1px",
              transition: "color 0.15s",
            }}
          >
            {CAT_ICON[cat]}
            {cat.charAt(0) + cat.slice(1).toLowerCase()}
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 400,
                color: activeTab === cat ? CAT_COLOR[cat] : "var(--text-faint)",
              }}
            >
              ({data?.[cat]?.length ?? 0})
            </span>
          </button>
        ))}
      </div>
      <CategoryRatingChart
        category={activeTab}
        points={data?.[activeTab] ?? []}
      />
    </div>
  );
}

/* ── Paginated game history table ── */
function GameHistoryTable({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGameHistory(page, PAGE_SIZE);

  const games = data?.games ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          gap: "0.5rem",
          color: "var(--text-muted)",
        }}
      >
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "0.85rem" }}>Loading games…</span>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className={styles.emptySection} style={{ padding: "1.5rem 0" }}>
        <p>No games played yet.</p>
        <button type="button" className={styles.playBtn}>
          Play
        </button>
      </div>
    );
  }

  return (
    <div style={{ opacity: isFetching ? 0.6 : 1, transition: "opacity 0.15s" }}>
      {/* Header row */}
      <div
        className={styles.historyRow}
        style={{
          opacity: 0.5,
          fontSize: "0.75rem",
          borderBottom: "1px solid var(--card-border)",
          paddingBottom: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        <span>Opponent</span>
        <span>Result</span>
        <span>Accuracy</span>
        <span>Moves</span>
        <span>Date</span>
      </div>

      {games.map((game) => {
        const accuracy =
          game.playerColor === "white"
            ? game.analysis?.whiteAccuracy
            : game.analysis?.blackAccuracy;

        const resultColor =
          game.result === "WIN"
            ? "#4ADE80"
            : game.result === "LOSS"
              ? "#F87171"
              : "#A78BFA";

        return (
          <div
            key={game.id}
            className={styles.historyRow}
            style={{ fontSize: "0.84rem", alignItems: "center" }}
          >
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {game.opponent.username ?? "Unknown"}
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-faint)",
                  fontWeight: 400,
                  marginLeft: "0.4rem",
                }}
              >
                ({game.gameName} · {game.timeControl})
              </span>
            </span>
            <span
              style={{
                color: resultColor,
                fontWeight: 800,
                textTransform: "capitalize",
              }}
            >
              {game.result === "WIN"
                ? "Win"
                : game.result === "LOSS"
                  ? "Loss"
                  : game.result === "DRAW"
                    ? "Draw"
                    : "—"}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {accuracy != null ? `${accuracy.toFixed(1)}%` : "—"}
            </span>
            <span style={{ color: "var(--text-muted)" }}>{game.moveCount}</span>
            <span style={{ color: "var(--text-faint)" }}>
              {formatDate(String(game.date))}
            </span>
          </div>
        );
      })}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={paginationStyles.row}>
          <span style={paginationStyles.info}>
            Page {page} of {totalPages} · {total} games
          </span>
          <div style={paginationStyles.btns}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              style={paginationStyles.btn}
            >
              <ChevronLeft size={15} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              style={paginationStyles.btn}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const paginationStyles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: "0.85rem",
    marginTop: "0.25rem",
    borderTop: "1px solid var(--card-border)",
  },
  info: { fontSize: "0.78rem", color: "var(--text-faint)" },
  btns: { display: "flex", gap: "0.5rem" },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "0.35rem 0.75rem",
    cursor: "pointer",
    transition: "background 0.14s",
  },
};

/* ── Main ProfileCard ── */
export default function ProfileCard() {
  const { user } = useAuth();
  const { data: profile, isLoading, error } = useProfile(user?.id);
  const updateProfileMutation = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Overview");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className={styles.container}>Loading...</div>;
  if (error)
    return <div className={styles.container}>Error loading profile</div>;
  if (!profile) return <div className={styles.container}>No profile found</div>;

  const totalGames = profile.wins + profile.losses + profile.draws;
  const avatarUrl = profile.profileImageUrl || DEFAULT_AVATAR;

  const handleUpdate = (updatedData: {
    username?: string;
    profileImageUrl?: string;
    bio?: string;
  }) => {
    if (user?.id) {
      updateProfileMutation.mutate(
        { userId: user.id, data: updatedData },
        { onSuccess: () => setIsEditing(false) },
      );
    }
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const result = await uploadFile(file, "avatars");
      handleUpdate({ profileImageUrl: result.url });
    } catch {
      setAvatarError("Upload failed. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarFileChange}
      />

      {/* ── Profile Header Banner ── */}
      <div className={styles.profileBanner}>
        <div
          className={styles.avatarSection}
          onClick={() => !avatarUploading && fileInputRef.current?.click()}
          style={{ cursor: avatarUploading ? "default" : "pointer" }}
        >
          <div className={styles.avatar}>
            <img
              key={avatarUrl}
              src={avatarUrl}
              alt={profile.username}
              className={styles.avatarImg}
              crossOrigin="anonymous"
            />
            {avatarUploading ? (
              <div className={styles.avatarOverlay} style={{ opacity: 1 }}>
                <Loader2
                  size={26}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
            ) : (
              <div className={styles.avatarOverlay}>
                <Edit2 size={22} />
                <span>Change</span>
              </div>
            )}
          </div>
          {avatarError && (
            <p
              style={{
                position: "absolute",
                bottom: "-1.4rem",
                left: 0,
                fontSize: "0.72rem",
                color: "#F87171",
                whiteSpace: "nowrap",
              }}
            >
              {avatarError}
            </p>
          )}
        </div>

        <div className={styles.bannerInfo}>
          {isEditing ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={profile.username}
                className={styles.editInput}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => handleUpdate({ username })}
                  disabled={updateProfileMutation.isPending || !username.trim()}
                  className={styles.saveBtn}
                >
                  {updateProfileMutation.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.usernameRow}>
              <h1 className={styles.username}>{profile.username}</h1>
              <Edit2
                size={17}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setUsername(profile.username);
                }}
                className={styles.editIcon}
              />
            </div>
          )}

          <p className={styles.realName}>{profile.email ?? "—"}</p>

          {/* Bio */}
          {editingBio ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                maxWidth: "420px",
              }}
            >
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself…"
                maxLength={280}
                rows={3}
                className={styles.bioTextarea}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    handleUpdate({ bio });
                    setEditingBio(false);
                  }}
                  disabled={updateProfileMutation.isPending}
                  className={styles.saveBtn}
                >
                  {updateProfileMutation.isPending ? "Saving…" : "Save Bio"}
                </button>
                <button
                  onClick={() => setEditingBio(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className={styles.statusText}
              onClick={() => {
                setBio(profile.bio ?? "");
                setEditingBio(true);
              }}
              style={{ cursor: "pointer" }}
              title="Click to edit bio"
            >
              {profile.bio ? (
                profile.bio
              ) : (
                <span style={{ opacity: 0.4, fontStyle: "italic" }}>
                  Add a bio…
                </span>
              )}
              <Edit2
                size={12}
                style={{
                  marginLeft: "0.4rem",
                  opacity: 0.4,
                  verticalAlign: "middle",
                }}
              />
            </p>
          )}

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              Joined {formatJoinDate(profile.createdAt)}
            </span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>{totalGames} games played</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>Online now</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "Overview" && (
        <div className={styles.overviewGrid}>
          {/* ── Per-category ratings ── */}
          <div className={styles.ratingsRow}>
            {(["BULLET", "BLITZ", "RAPID"] as const).map((cat) => {
              const r = (profile as any).ratings?.find(
                (x: any) => x.category === cat,
              );
              const rating = r?.rating ?? 1200;
              const wins = r?.wins ?? 0;
              const losses = r?.losses ?? 0;
              const draws = r?.draws ?? 0;
              const total = wins + losses + draws;
              const COLOR: Record<string, string> = {
                BULLET: "#e85d5d",
                BLITZ: "#f59e0b",
                RAPID: "#3ecf8e",
              };
              const color = COLOR[cat] ?? "#a8b4c0";
              return (
                <div
                  key={cat}
                  className={styles.ratingCatCard}
                  style={{ "--cat-color": color } as React.CSSProperties}
                >
                  <div className={styles.ratingCatHeader}>
                    <span className={styles.ratingCatIcon}>
                      {CAT_ICON[cat]}
                    </span>
                    <span className={styles.ratingCatLabel}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <div className={styles.ratingCatValue} style={{ color }}>
                    {rating}
                  </div>
                  <div className={styles.ratingCatBar}>
                    <div
                      className={styles.ratingCatBarFill}
                      style={{
                        width: ratingBarWidth(rating),
                        background: color,
                      }}
                    />
                  </div>
                  <div className={styles.ratingCatStats}>
                    <span style={{ color: "#4ade80" }}>{wins}W</span>
                    <span style={{ color: "var(--text-faint)" }}>·</span>
                    <span style={{ color: "#f87171" }}>{losses}L</span>
                    <span style={{ color: "var(--text-faint)" }}>·</span>
                    <span style={{ color: "#a78bfa" }}>{draws}D</span>
                    {total > 0 && (
                      <span className={styles.ratingCatTotal}>({total})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <Swords size={28} className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>Wins / Losses / Draws</div>
                <div className={styles.statValue}>
                  {profile.wins}W · {profile.losses}L · {profile.draws}D
                </div>
              </div>
            </div>
            <div className={styles.statCard}>
              <Trophy size={28} className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>Total Games</div>
                <div className={styles.statValue}>{totalGames}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <Activity size={28} className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>Win Rate</div>
                <div className={styles.statValue}>
                  {winRate(profile.wins, profile.losses)}
                </div>
              </div>
            </div>
            <div className={styles.statCard}>
              <BarChart3 size={28} className={styles.statIcon} />
              <div>
                <div className={styles.statLabel}>Rating</div>
                <div className={styles.statValue}>{profile.rating}</div>
              </div>
            </div>
          </div>

          {/* Rating History — 3 tabs (Bullet / Blitz / Rapid) */}
          <div className={styles.ratingCard}>
            <RatingHistoryCharts />
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Trophy size={18} />
              <span className={styles.sectionTitle}>
                Game History ({totalGames})
              </span>
            </div>
            <div className={styles.historyTable}>
              {user?.id && <GameHistoryTable userId={user.id} />}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Friends" && (
        <div className={styles.overviewGrid}>
          <FriendsPanel compact />
        </div>
      )}

      {activeTab !== "Overview" && activeTab !== "Friends" && (
        <div className={styles.emptyTab}>
          <p>{activeTab} content coming soon.</p>
        </div>
      )}
    </div>
  );
}
