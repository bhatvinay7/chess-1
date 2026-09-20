"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

interface PlayChessMenuProps {
  onPlayOnline: () => void;
}

const MODES = [
  {
    key: "online",
    emoji: "⚡",
    title: "Play Online",
    desc: "Play vs a person of similar skill",
    active: true,
  },
  {
    key: "bots",
    emoji: "🤖",
    title: "Play Bots",
    desc: "Challenge a bot from Easy to Master",
    active: true,
  },
  {
    key: "coach",
    emoji: "🎓",
    title: "Play Coach",
    desc: "Learn openings move-by-move with Coach Chatur",
    active: true,
  },
  {
    key: "friend",
    emoji: "🤝",
    title: "Play a Friend",
    desc: "Invite a friend to a game of chess",
    active: true,
  },
  {
    key: "tournament",
    emoji: "🏆",
    title: "Tournaments",
    desc: "Join an Arena where anyone can win",
    active: true,
  },
  // Chess Variants hidden — game type (Standard / Chess960) is shown
  // inline in the time-control picker when clicking Play Online.
];

export function PlayChessMenu({ onPlayOnline }: PlayChessMenuProps) {
  const router = useRouter();
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);
  const st = makeStyles(darkUI);

  const handleClick = (key: string) => {
    if (key === "online") onPlayOnline();
    if (key === "bots") router.push("/arena/bot");
    if (key === "coach") router.push("/arena/coach");
    if (key === "tournament") router.push("/tournament");
    if (key === "friend") router.push("/arena/invite");
  };

  return (
    <div style={st.root}>
      <div style={st.header}>
        <span style={st.headerPawn}>♟</span>
        <span style={st.headerTitle}>Play Chess</span>
      </div>

      <div style={st.list}>
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={m.active ? () => handleClick(m.key) : undefined}
            disabled={!m.active}
            style={{
              ...st.item,
              opacity: m.active ? 1 : 0.45,
              cursor: m.active ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
              if (m.active) {
                (e.currentTarget as HTMLButtonElement).style.background = darkUI
                  ? "rgba(124,163,95,0.12)"
                  : "rgba(0,0,0,0.06)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  darkUI ? "rgba(124,163,95,0.28)" : "rgba(0,0,0,0.22)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = darkUI
                ? "#121212"
                : "rgba(0,0,0,0.04)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = darkUI
                ? "rgba(124,163,95,0.1)"
                : "rgba(0,0,0,0.12)";
            }}
          >
            <div style={st.itemEmoji}>{m.emoji}</div>
            <div style={st.itemText}>
              <div style={st.itemTitle}>{m.title}</div>
              <div style={st.itemDesc}>{m.desc}</div>
            </div>
            <div style={st.itemArrow}>›</div>
          </button>
        ))}
      </div>

      <div style={st.footer}>
        <Link href="/history" style={st.footerLink}>
          🎮 Game History
        </Link>
        <span style={st.footerDot} />
        <button type="button" style={st.footerBtn}>
          📊 Leaderboard
        </button>
      </div>
    </div>
  );
}

function makeStyles(dark: boolean): Record<string, React.CSSProperties> {
  const titleColor = dark ? "#e8f5d8" : "#0a0a0a";
  const itemTitle = dark ? "#c8e6a8" : "#111";
  const itemDesc = dark ? "#6a8a58" : "#444";
  const itemArrow = dark ? "#3e5535" : "#666";
  const itemBg = dark ? "#121212" : "rgba(0,0,0,0.04)";
  const itemBorder = dark ? "rgba(124,163,95,0.1)" : "rgba(0,0,0,0.12)";
  const emojiBg = dark ? "rgba(124,163,95,0.1)" : "rgba(0,0,0,0.06)";
  const dividerColor = dark ? "rgba(124,163,95,0.13)" : "rgba(0,0,0,0.10)";
  const footerColor = dark ? "#7fa568" : "#333";
  const dotColor = dark ? "#3e5535" : "#aaa";

  return {
    root: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      paddingBottom: "0.8rem",
      marginBottom: "0.6rem",
      borderBottom: `1px solid ${dividerColor}`,
    },
    headerPawn: {
      fontSize: "1.15rem",
      color: "#81b64c",
      filter: "drop-shadow(0 0 6px rgba(124,199,64,0.4))",
    },
    headerTitle: {
      fontSize: "1rem",
      fontWeight: 800,
      color: titleColor,
      letterSpacing: "0.01em",
    },
    list: {
      display: "flex",
      flexDirection: "column",
      gap: "0.3rem",
    },
    item: {
      display: "flex",
      alignItems: "center",
      gap: "0.7rem",
      padding: "0.6rem 0.7rem",
      background: itemBg,
      border: `1px solid ${itemBorder}`,
      borderRadius: "8px",
      width: "100%",
      textAlign: "left",
      transition: "background 0.14s ease, border-color 0.14s ease",
    },
    itemEmoji: {
      width: "34px",
      height: "34px",
      background: emojiBg,
      borderRadius: "7px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.1rem",
      flexShrink: 0,
    },
    itemText: {
      flex: 1,
      minWidth: 0,
    },
    itemTitle: {
      fontSize: "0.86rem",
      fontWeight: 700,
      color: itemTitle,
      lineHeight: 1.2,
    },
    itemDesc: {
      fontSize: "0.71rem",
      color: itemDesc,
      marginTop: "0.1rem",
      lineHeight: 1.3,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    itemArrow: {
      fontSize: "1.15rem",
      color: itemArrow,
      flexShrink: 0,
      lineHeight: 1,
    },
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.6rem",
      marginTop: "0.8rem",
      paddingTop: "0.7rem",
      borderTop: `1px solid ${dividerColor}`,
    },
    footerLink: {
      fontSize: "0.76rem",
      color: footerColor,
      fontWeight: 600,
      textDecoration: "none",
    },
    footerDot: {
      width: "3px",
      height: "3px",
      borderRadius: "50%",
      background: dotColor,
      flexShrink: 0,
    },
    footerBtn: {
      fontSize: "0.76rem",
      color: footerColor,
      fontWeight: 600,
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
    },
  };
}
