"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { TIME_CONTROLS, TimeGroup } from "@/lib/timeControls";
import { useWatchList, type LiveGame } from "../../hooks/useWatchList";

type NavTab = "New Game" | "Games" | "Players";

export type GameVariant = "standard" | "chess960";

export default function TimeController({
  onStartSearch,
  setTimeControl,
  setIsRatedGame,
  isRated,
  time_slot,
  group,
  gameVariant = "standard",
  setGameVariant,
}: {
  onStartSearch: () => void;
  setTimeControl: (selected: string) => void;
  setIsRatedGame: (isRated: boolean) => void;
  isRated: boolean;
  time_slot: { label: string; value: string };
  group: TimeGroup;
  gameVariant?: GameVariant;
  setGameVariant?: (v: GameVariant) => void;
}) {
  const [activeTab, setActiveTab] = useState<NavTab>("New Game");
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);
  const st = makeStyles(darkUI);

  return (
    <div style={st.root}>
      {/* Tabs */}
      <div style={st.tabs}>
        {(["New Game", "Games", "Players"] as NavTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            style={{ ...st.tab, ...(activeTab === tab ? st.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "New Game" && <span style={{ fontSize: "0.85rem" }}>✚</span>}
            {tab === "Games"    && <span style={{ fontSize: "0.85rem" }}>⊞</span>}
            {tab === "Players"  && <span style={{ fontSize: "0.85rem" }}>👥</span>}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "New Game" && (
        <>
          {/* Selected time badge */}
          <div style={st.selectedBadge}>
            <span style={{ fontSize: "0.95rem" }}>{group?.icon ?? "⏱"}</span>
            <span style={st.selectedBadgeText}>
              {group?.options.find((v) => v.value === time_slot.value)?.value ?? "10 min"}{" "}
              ({group?.category ?? "Rapid"})
            </span>
          </div>

          {/* Game type selector */}
          <div style={{ marginBottom: "0.65rem" }}>
            <div style={{
              fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase",
              letterSpacing: "0.08em", color: darkUI ? "rgba(200,230,200,0.45)" : "#666",
              marginBottom: "0.4rem",
            }}>
              Game Type
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem",
            }}>
              {(["standard", "chess960"] as GameVariant[]).map((v) => {
                const active = gameVariant === v;
                const label = v === "standard" ? "♟ Standard" : "⚄ Chess960";
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGameVariant?.(v)}
                    style={{
                      padding: "0.52rem 0.5rem",
                      borderRadius: "7px",
                      fontSize: "0.78rem",
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.13s",
                      background: active
                        ? (darkUI ? "rgba(80,160,40,0.20)" : "rgba(80,160,40,0.12)")
                        : (darkUI ? "#121212" : "rgba(0,0,0,0.05)"),
                      border: `1px solid ${active
                        ? (darkUI ? "rgba(80,160,40,0.55)" : "rgba(80,160,40,0.45)")
                        : (darkUI ? "rgba(124,163,95,0.14)" : "rgba(0,0,0,0.14)")}`,
                      color: active
                        ? (darkUI ? "#aad478" : "#1a5c08")
                        : (darkUI ? "#7fa568" : "#333"),
                      boxShadow: active ? "0 0 8px rgba(93,171,58,0.18)" : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rated toggle */}
          <div style={st.ratedRow}>
            <span style={st.ratedLabel}>Rated</span>
            <label style={st.toggle}>
              <input
                type="checkbox"
                checked={isRated}
                onChange={() => setIsRatedGame(isRated)}
                style={{ display: "none" }}
              />
              <span
                style={{
                  ...st.toggleSlider,
                  background: isRated ? "rgba(129,182,76,0.45)" : "rgba(124,163,95,0.15)",
                  borderColor: isRated ? "rgba(129,182,76,0.6)" : "rgba(124,163,95,0.2)",
                }}
              >
                <span
                  style={{
                    ...st.toggleThumb,
                    transform: isRated
                      ? "translateX(18px) translateY(-50%)"
                      : "translateX(0) translateY(-50%)",
                    background: isRated ? "#aad48a" : darkUI ? "#7fa568" : "#5a8a40",
                  }}
                />
              </span>
            </label>
          </div>

          {/* Time control groups */}
          <div style={st.groups}>
            {TIME_CONTROLS.map((grp) => (
              <div key={grp.category} style={st.group}>
                <div style={st.groupLabel}>
                  <span>{grp.icon}</span>
                  <span>{grp.category}</span>
                </div>
                <div style={st.groupOptions}>
                  {grp.options.map((opt) => {
                    const active = time_slot.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTimeControl(opt.value)}
                        style={{
                          ...st.optBtn,
                          background: active
                            ? "rgba(80,160,40,0.16)"
                            : darkUI ? "#121212" : "rgba(0,0,0,0.07)",
                          border: `1px solid ${active ? "rgba(80,160,40,0.55)" : darkUI ? "rgba(124,163,95,0.12)" : "rgba(0,0,0,0.18)"}`,
                          color: active
                            ? (darkUI ? "#aad478" : "#0d4200")
                            : darkUI ? "#7fa568" : "#111",
                          fontWeight: active ? 700 : 600,
                          boxShadow: active ? "0 0 8px rgba(93,171,58,0.15)" : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLButtonElement).style.background =
                              darkUI ? "rgba(124,163,95,0.08)" : "rgba(0,0,0,0.13)";
                            (e.currentTarget as HTMLButtonElement).style.color =
                              darkUI ? "#a0c880" : "#000";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLButtonElement).style.background =
                              darkUI ? "#121212" : "rgba(0,0,0,0.07)";
                            (e.currentTarget as HTMLButtonElement).style.color =
                              darkUI ? "#7fa568" : "#111";
                          }
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Start Game */}
          <button
            type="button"
            onClick={onStartSearch}
            style={st.startBtn}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            Start Game
          </button>

          <div style={st.secondaryBtns}>
            <button type="button" style={st.secondaryBtn}>⚙ Custom Challenge</button>
            <button type="button" style={st.secondaryBtn}>🤝 Play a Friend</button>
            <button type="button" style={st.secondaryBtn}>🏆 Tournaments</button>
          </div>
        </>
      )}

      {activeTab === "Games" && (
        <GamesTab dark={darkUI} />
      )}

      {activeTab === "Players" && (
        <div style={st.emptyTab}>Online players will appear here.</div>
      )}
    </div>
  );
}

// ── GamesTab: compact live-game list ──────────────────────────────────────────

const DEFAULT_AVATAR = "/defaultUser.jpg";

function tcCategory(slot: string): { icon: string; label: string } {
  const parts = slot.split("+");
  const mins  = parseFloat(parts[0] ?? "5") || 5;
  const inc   = parseFloat(parts[1] ?? "0") || 0;
  const est   = mins * 60 + inc * 40;
  if (est < 179)  return { icon: "⚡", label: "Bullet"  };
  if (est < 599)  return { icon: "🔥", label: "Blitz"   };
  if (est < 1800) return { icon: "⏱",  label: "Rapid"   };
  return             { icon: "♟",  label: "Classic" };
}

function GamesTab({ dark }: { dark: boolean }) {
  const { games, loading, refresh } = useWatchList(true);
  const router = useRouter();

  const textPrimary = dark ? "rgba(255,255,255,0.88)" : "#111";
  const textMuted   = dark ? "#7fa568"                : "#444";
  const textFaint   = dark ? "rgba(200,230,200,0.45)" : "#888";
  const cardBg      = dark ? "#121212" : "rgba(0,0,0,0.04)";
  const cardBorder  = dark ? "rgba(124,163,95,0.13)"  : "rgba(0,0,0,0.12)";
  const cardHoverBg = dark ? "rgba(124,163,95,0.09)"  : "rgba(0,0,0,0.07)";
  const divider     = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "0.55rem",
      }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Live Games
        </span>
        <button
          type="button"
          onClick={refresh}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: textFaint, padding: 0, fontFamily: "inherit" }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && games.length === 0 && (
        <div style={{ textAlign: "center", color: textFaint, fontSize: "0.8rem", padding: "1.5rem 0" }}>
          Loading…
        </div>
      )}

      {!loading && games.length === 0 && (
        <div style={{ textAlign: "center", color: textFaint, fontSize: "0.8rem", padding: "1.5rem 0" }}>
          No live games at the moment
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "380px", overflowY: "auto" }}>
        {games.map((g) => {
          const tc   = tcCategory(g.timeSlot);
          const p1IsWhite = g.player1.id === g.whitePlayerId;
          const white = p1IsWhite ? g.player1 : g.player2;
          const black = p1IsWhite ? g.player2 : g.player1;

          return (
            <button
              key={g.gameId}
              type="button"
              onClick={() => router.push(`/spectate/${g.gameId}`)}
              style={{
                display: "flex", alignItems: "center", gap: "0.55rem",
                padding: "0.5rem 0.65rem",
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: "7px",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = cardHoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = cardBg; }}
            >
              {/* Game type icon + time control */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "1px", flexShrink: 0, width: "32px",
              }}>
                <span style={{ fontSize: "1rem", lineHeight: 1 }}>{tc.icon}</span>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: textMuted }}>{g.timeSlot}</span>
              </div>

              {/* Black avatar */}
              <img
                src={black.profileImage || DEFAULT_AVATAR}
                alt={black.username}
                crossOrigin="anonymous"
                style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${divider}` }}
              />

              {/* Names + ratings */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>
                    {black.username}
                  </span>
                  <span style={{ fontSize: "0.62rem", color: textFaint }}>{black.rating}</span>
                </div>
                <div style={{ height: "1px", background: divider }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>
                    {white.username}
                  </span>
                  <span style={{ fontSize: "0.62rem", color: textFaint }}>{white.rating}</span>
                </div>
              </div>

              {/* White avatar */}
              <img
                src={white.profileImage || DEFAULT_AVATAR}
                alt={white.username}
                crossOrigin="anonymous"
                style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${divider}` }}
              />

              {/* Watch label */}
              <span style={{ fontSize: "0.62rem", fontWeight: 700, color: textMuted, flexShrink: 0 }}>
                Watch
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function makeStyles(dark: boolean): Record<string, React.CSSProperties> {
  const textPrimary = dark ? "rgba(255,255,255,0.88)" : "#0a0a0a";
  const textMuted   = dark ? "#7fa568"                : "#1a1a1a";
  const textFaint   = dark ? "rgba(200,230,200,0.55)" : "#333";
  const borderColor = dark ? "rgba(124,163,95,0.12)"  : "rgba(0,0,0,0.16)";
  const groupBg     = dark ? "#121212"        : "rgba(0,0,0,0.06)";

  return {
    root: { display: "flex", flexDirection: "column", gap: 0, width: "100%" },

    tabs: {
      display: "flex",
      borderBottom: `1px solid ${borderColor}`,
      marginBottom: "0.85rem",
    },
    tab: {
      flex: 1,
      padding: "0.55rem 0.25rem",
      background: "transparent",
      border: "none",
      borderBottom: "2px solid transparent",
      color: textMuted,
      fontSize: "0.75rem",
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.3rem",
      transition: "color 0.14s, border-color 0.14s",
      marginBottom: "-1px",
    },
    tabActive: {
      color: dark ? "#c8e6a8" : "#1a5c08",
      borderBottomColor: "#81b64c",
    },

    selectedBadge: {
      display: "flex",
      alignItems: "center",
      gap: "0.45rem",
      padding: "0.45rem 0.7rem",
      background: dark ? "rgba(124,163,95,0.08)" : "rgba(0,0,0,0.05)",
      border: `1px solid ${borderColor}`,
      borderRadius: "6px",
      marginBottom: "0.5rem",
    },
    selectedBadgeText: {
      fontSize: "0.85rem",
      fontWeight: 700,
      color: dark ? "#c8e6a8" : "#111",
    },

    ratedRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "0.6rem",
    },
    ratedLabel: {
      fontSize: "0.84rem",
      fontWeight: 600,
      color: textPrimary,
    },
    toggle: {
      position: "relative",
      width: "40px",
      height: "22px",
      cursor: "pointer",
      display: "block",
    },
    toggleSlider: {
      position: "absolute",
      inset: 0,
      borderRadius: "99px",
      border: "1px solid",
      transition: "background 0.2s, border-color 0.2s",
      display: "block",
    },
    toggleThumb: {
      position: "absolute",
      left: "3px",
      top: "50%",
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      transition: "transform 0.2s, background 0.2s",
      display: "block",
    },

    groups: {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      marginBottom: "0.75rem",
    },
    group: {
      background: groupBg,
      border: `1px solid ${borderColor}`,
      borderRadius: "7px",
      padding: "0.6rem 0.7rem",
    },
    groupLabel: {
      display: "flex",
      alignItems: "center",
      gap: "0.3rem",
      fontSize: "0.7rem",
      fontWeight: 700,
      color: textMuted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "0.5rem",
    },
    groupOptions: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "0.35rem",
    },
    optBtn: {
      padding: "0.5rem 0.35rem",
      borderRadius: "5px",
      fontSize: "0.8rem",
      cursor: "pointer",
      transition: "all 0.12s ease",
      textAlign: "center",
      fontFamily: "inherit",
    },

    startBtn: {
      width: "100%",
      padding: "0.78rem",
      background: "linear-gradient(160deg, #5ab04a, #3a8a2a)",
      border: "none",
      borderRadius: "7px",
      color: "#fff",
      fontWeight: 800,
      fontSize: "1rem",
      cursor: "pointer",
      boxShadow: "0 4px 18px rgba(80,180,60,0.3)",
      transition: "filter 0.15s ease, transform 0.15s ease",
      letterSpacing: "0.02em",
      marginBottom: "0.4rem",
    },

    secondaryBtns: { display: "flex", flexDirection: "column", gap: "0.3rem" },
    secondaryBtn: {
      width: "100%",
      padding: "0.6rem",
      background: dark ? "#121212" : "rgba(0,0,0,0.04)",
      border: `1px solid ${borderColor}`,
      borderRadius: "6px",
      color: textFaint,
      fontSize: "0.83rem",
      fontWeight: 600,
      cursor: "pointer",
      textAlign: "center",
      transition: "background 0.13s",
      fontFamily: "inherit",
    },

    emptyTab: {
      textAlign: "center",
      color: textFaint,
      fontSize: "0.85rem",
      padding: "2rem 0",
    },
  };
}
